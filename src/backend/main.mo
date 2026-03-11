import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import OutCall "http-outcalls/outcall";
import Stripe "stripe/stripe";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
  };

  type InternalAlbum = {
    id : Nat;
    name : Text;
    description : Text;
    coverBlobId : ?Text;
    createdAt : Int;
    photoCount : Nat;
  };

  type InternalPhoto = {
    id : Text;
    title : Text;
    description : Text;
    albumId : Nat;
    blobId : Text;
    uploadedAt : Int;
    price : Nat;
  };

  public type Album = {
    id : Nat;
    name : Text;
    description : Text;
    coverBlobId : ?Text;
    createdAt : Int;
    photoCount : Nat;
  };

  public type Photo = {
    id : Text;
    title : Text;
    description : Text;
    albumId : Nat;
    blobId : Text;
    uploadedAt : Int;
    price : Nat;
  };

  module Album {
    public func compare(a1 : Album, a2 : Album) : Order.Order {
      Int.compare(a2.createdAt, a1.createdAt);
    };
  };

  module Photo {
    public func compare(p1 : Photo, p2 : Photo) : Order.Order {
      Int.compare(p2.uploadedAt, p1.uploadedAt);
    };
  };

  let albums = Map.empty<Nat, InternalAlbum>();
  let photos = Map.empty<Text, InternalPhoto>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var seeded = false;
  var nextAlbumId = 0;
  var adminAssigned = false;
  var stripeConfig : ?Stripe.StripeConfiguration = null;

  public shared ({ caller }) func registerAsAdmin() : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Los usuarios anónimos no pueden registrarse como administrador");
    };

    if (adminAssigned) {
      Runtime.trap("Ya existe un administrador");
    };

    AccessControl.assignRole(accessControlState, caller, caller, #admin);
    adminAssigned := true;
  };

  public query ({ caller }) func isStripeConfigured() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para verificar la configuración de Stripe. Solo administradores pueden hacerlo.");
    };
    stripeConfig != null;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("No tienes permisos para acceder a tu perfil. Solo usuarios autenticados pueden hacerlo.");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("No tienes permisos para acceder a otros perfiles. Solo admins pueden hacerlo.");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("No tienes permisos para guardar el perfil. Solo usuarios autenticados pueden hacerlo.");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para configurar Stripe. Solo administradores pueden hacerlo.");
    };
    stripeConfig := ?config;
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("No tienes permisos para crear sesiones de pago. Solo usuarios autenticados pueden hacerlo.");
    };
    switch (stripeConfig) {
      case (null) {
        Runtime.trap("Stripe debe estar configurado primero");
      };
      case (?config) {
        await Stripe.createCheckoutSession(
          config,
          caller,
          items,
          successUrl,
          cancelUrl,
          transform,
        );
      };
    };
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("No tienes permisos para verificar el estado de pagos. Solo usuarios autenticados pueden hacerlo.");
    };
    switch (stripeConfig) {
      case (null) {
        Runtime.trap("Stripe debe estar configurado");
      };
      case (?config) {
        await Stripe.getSessionStatus(config, sessionId, transform);
      };
    };
  };

  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  func timestamp() : Int {
    Time.now();
  };

  func toPublicAlbum(internal : InternalAlbum) : Album {
    {
      id = internal.id;
      name = internal.name;
      description = internal.description;
      coverBlobId = internal.coverBlobId;
      createdAt = internal.createdAt;
      photoCount = internal.photoCount;
    };
  };

  func toPublicPhoto(internal : InternalPhoto) : Photo {
    {
      id = internal.id;
      title = internal.title;
      description = internal.description;
      albumId = internal.albumId;
      blobId = internal.blobId;
      uploadedAt = internal.uploadedAt;
      price = internal.price;
    };
  };

  // Public queries - no authorization needed (accessible to guests)
  public query ({ caller }) func getAlbums() : async [Album] {
    albums.values().toArray().map(toPublicAlbum).sort();
  };

  public query ({ caller }) func getAlbum(id : Nat) : async ?Album {
    switch (albums.get(id)) {
      case (null) { null };
      case (?internal) { ?toPublicAlbum(internal) };
    };
  };

  public query ({ caller }) func getPhotos() : async [Photo] {
    photos.values().toArray().map(toPublicPhoto).sort();
  };

  public query ({ caller }) func getPhotosByAlbum(albumId : Nat) : async [Photo] {
    let filtered = photos.values().toArray().filter(
      func(p) { p.albumId == albumId }
    );
    filtered.map(toPublicPhoto).sort();
  };

  public query ({ caller }) func getPhoto(id : Text) : async ?Photo {
    switch (photos.get(id)) {
      case (null) { null };
      case (?internal) { ?toPublicPhoto(internal) };
    };
  };

  // Admin-only functions
  public shared ({ caller }) func createAlbum(name : Text, description : Text) : async Album {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para crear albums. Solo administradores pueden hacerlo.");
    };

    let id = nextAlbumId;
    nextAlbumId += 1;
    let album : InternalAlbum = {
      id;
      name;
      description;
      coverBlobId = null;
      createdAt = timestamp();
      photoCount = 0;
    };
    albums.add(id, album);
    toPublicAlbum(album);
  };

  public shared ({ caller }) func updateAlbum(id : Nat, name : Text, description : Text, coverBlobId : ?Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para editar album. Solo administradores pueden hacerlo.");
    };

    switch (albums.get(id)) {
      case (null) { false };
      case (?oldAlbum) {
        let updatedAlbum : InternalAlbum = {
          oldAlbum with
          name;
          description;
          coverBlobId;
        };
        albums.add(id, updatedAlbum);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteAlbum(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para eliminar albums. Solo administradores pueden hacerlo.");
    };

    switch (albums.get(id)) {
      case (null) { false };
      case (?_) {
        albums.remove(id);
        let filteredPhotos = photos.entries().toArray().filter(
          func((_, p)) { p.albumId != id }
        );
        photos.clear();
        for ((photoId, photo) in filteredPhotos.values()) {
          photos.add(photoId, photo);
        };
        true;
      };
    };
  };

  public shared ({ caller }) func addPhoto(title : Text, description : Text, albumId : Nat, blobId : Text, price : Nat) : async ?Photo {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para añadir fotos. Solamente administradores pueden hacerlo.");
    };

    switch (albums.get(albumId)) {
      case (null) { null };
      case (?_) {
        let id = title # timestamp().toText() # blobId;
        let photo : InternalPhoto = {
          id;
          title;
          description;
          albumId;
          blobId;
          price;
          uploadedAt = timestamp();
        };
        photos.add(id, photo);
        switch (albums.get(albumId)) {
          case (?album) {
            let updatedAlbum : InternalAlbum = {
              album with
              photoCount = album.photoCount + 1;
            };
            albums.add(albumId, updatedAlbum);
          };
          case (null) { () };
        };
        ?toPublicPhoto(photo);
      };
    };
  };

  public shared ({ caller }) func updatePhoto(id : Text, title : Text, description : Text, albumId : Nat, price : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para editar fotos. Solamente administradores pueden hacerlo.");
    };

    switch (photos.get(id)) {
      case (null) { false };
      case (?oldPhoto) {
        let updatedPhoto : InternalPhoto = {
          oldPhoto with
          title;
          description;
          albumId;
          price;
        };
        photos.add(id, updatedPhoto);
        true;
      };
    };
  };

  public shared ({ caller }) func deletePhoto(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para eliminar fotos. Solamente administradores pueden hacerlo.");
    };

    switch (photos.get(id)) {
      case (null) { false };
      case (?photo) {
        photos.remove(id);
        switch (albums.get(photo.albumId)) {
          case (?album) {
            let updatedAlbum : InternalAlbum = {
              album with
              photoCount = if (album.photoCount > 0) { album.photoCount - 1 } else { 0 };
            };
            albums.add(photo.albumId, updatedAlbum);
          };
          case (null) { () };
        };
        true;
      };
    };
  };

  public shared ({ caller }) func seedData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para inicializar datos. Solo administradores pueden hacerlo.");
    };

    if (seeded) { return () };
    seeded := true;

    let albumsData = [
      { name = "Urban Shadows"; desc = "Capturing city life."; photosCount = 3 },
      { name = "Wild Nature"; desc = "Landscapes and wildlife."; photosCount = 3 },
      { name = "Intimate Portraits"; desc = "People expressions."; photosCount = 3 },
    ];

    for (albumData in albumsData.values()) {
      let album : InternalAlbum = {
        id = nextAlbumId;
        name = albumData.name;
        description = albumData.desc;
        coverBlobId = ?"demo";
        createdAt = timestamp();
        photoCount = albumData.photosCount;
      };
      albums.add(nextAlbumId, album);
      nextAlbumId += 1;
    };

    let photosData = [
      { title = "Night Lights"; albumId = 0; desc = "City skyline" },
      { title = "Street Art"; albumId = 0; desc = "Graffiti" },
      { title = "Reflections"; albumId = 0; desc = "Puddles" },
      { title = "Mountain Peaks"; albumId = 1; desc = "Mountains" },
      { title = "Forest Trail"; albumId = 1; desc = "Sunlight" },
      { title = "River Rapids"; albumId = 1; desc = "Water" },
      { title = "Contemplation"; albumId = 2; desc = "Thinking" },
      { title = "Joyful Moment"; albumId = 2; desc = "Laughing" },
      { title = "Serenity"; albumId = 2; desc = "Peaceful" },
    ];

    for (photoData in photosData.values()) {
      let photo : InternalPhoto = {
        id = photoData.title # timestamp().toText() # "demo";
        title = photoData.title;
        description = photoData.desc;
        albumId = photoData.albumId;
        blobId = "demo";
        uploadedAt = timestamp();
        price = 1000;
      };
      photos.add(photo.id, photo);
    };
  };
};
