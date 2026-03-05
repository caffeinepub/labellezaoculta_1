import Map "mo:core/Map";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import Stripe "stripe/stripe";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Runtime "mo:core/Runtime";
import OutCall "http-outcalls/outcall";



actor {
  include MixinStorage();

  // Add explicit data extension type for permissionless Map data structures.
  type _Album = {
    id : Nat;
    name : Text;
    description : Text;
    coverBlobId : ?Text;
    createdAt : Int;
    photoCount : Nat;
  };

  type _Photo = {
    id : Text;
    title : Text;
    description : Text;
    albumId : Nat;
    blobId : Text;
    uploadedAt : Int;
    price : Nat;
  };

  type _UserProfile = {
    name : Text;
  };

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Stripe integration
  var stripeConfig : ?Stripe.StripeConfiguration = null;
  var adminAssigned = false;

  // Types
  type AlbumId = Nat;
  type PhotoId = Text;

  public type Album = _Album;

  public type Photo = _Photo;

  public type UserProfile = _UserProfile;

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

  // State
  let albums = Map.empty<AlbumId, _Album>();
  let photos = Map.empty<PhotoId, _Photo>();
  let userProfiles = Map.empty<Principal, _UserProfile>();
  var seeded = false;
  var nextAlbumId = 0;

  // Registration Function - first caller becomes admin
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
    stripeConfig != null;
  };

  // User Profile Functions - User-only access
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

  // Stripe Configuration - Admin-only
  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para configurar Stripe. Solo administradores pueden hacerlo.");
    };
    stripeConfig := ?config;
  };

  // Create Checkout Session - User-only (authenticated users can purchase)
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

  // Get Stripe Session Status - User-only
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

  // Transform function for HTTP outcalls - No auth needed (internal use)
  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  func timestamp() : Int {
    Time.now();
  };

  // Query functions - Guest access (anyone can view)
  public query ({ caller }) func getAlbums() : async [Album] {
    albums.values().toArray().sort();
  };

  public query ({ caller }) func getAlbum(id : AlbumId) : async ?Album {
    albums.get(id);
  };

  public query ({ caller }) func getPhotos() : async [Photo] {
    photos.values().toArray().sort();
  };

  public query ({ caller }) func getPhotosByAlbum(albumId : AlbumId) : async [Photo] {
    let filtered = photos.values().toArray().filter(
      func(p) { p.albumId == albumId }
    );
    filtered.sort();
  };

  public query ({ caller }) func getPhoto(id : PhotoId) : async ?Photo {
    photos.get(id);
  };

  // Admin-only CRUD operations
  public shared ({ caller }) func createAlbum(name : Text, description : Text) : async Album {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para crear albums. Solo administradores pueden hacerlo.");
    };

    let id = nextAlbumId;
    nextAlbumId += 1;
    let album : _Album = {
      id;
      name;
      description;
      coverBlobId = null;
      createdAt = timestamp();
      photoCount = 0;
    };
    albums.add(id, album);
    album;
  };

  public shared ({ caller }) func updateAlbum(id : AlbumId, name : Text, description : Text, coverBlobId : ?Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para editar album. Solo administradores pueden hacerlo.");
    };

    switch (albums.get(id)) {
      case (null) { false };
      case (?oldAlbum) {
        let updatedAlbum : _Album = {
          oldAlbum with
          name;
          description;
          coverBlobId
        };
        albums.add(id, updatedAlbum);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteAlbum(id : AlbumId) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para eliminar albums. Solo administradores pueden hacerlo.");
    };

    switch (albums.get(id)) {
      case (null) { false };
      case (?_) {
        albums.remove(id);

        // Remove photos in the album
        let photoIter = photos.entries();
        let filteredPhotos = photoIter.toArray().filter(
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

  public shared ({ caller }) func addPhoto(title : Text, description : Text, albumId : AlbumId, blobId : Text, price : Nat) : async ?Photo {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para añadir fotos. Solamente administradores pueden hacerlo.");
    };

    switch (albums.get(albumId)) {
      case (null) { null };
      case (?_) {
        let id = title # timestamp().toText() # blobId;
        let photo : _Photo = {
          id;
          title;
          description;
          albumId;
          blobId;
          price;
          uploadedAt = timestamp();
        };
        photos.add(id, photo);

        // Update album photo count
        switch (albums.get(albumId)) {
          case (?album) {
            let updatedAlbum : _Album = {
              album with
              photoCount = album.photoCount + 1;
            };
            albums.add(albumId, updatedAlbum);
          };
          case (null) { () };
        };
        ?photo;
      };
    };
  };

  public shared ({ caller }) func updatePhoto(id : PhotoId, title : Text, description : Text, albumId : AlbumId, price : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para editar fotos. Solamente administradores pueden hacerlo.");
    };

    switch (photos.get(id)) {
      case (null) { false };
      case (?oldPhoto) {
        let updatedPhoto : _Photo = {
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

  public shared ({ caller }) func deletePhoto(id : PhotoId) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("No tienes permisos para eliminar fotos. Solamente administradores pueden hacerlo.");
    };

    switch (photos.get(id)) {
      case (null) { false };
      case (?photo) {
        photos.remove(id);

        // Update album photo count
        switch (albums.get(photo.albumId)) {
          case (?album) {
            let updatedAlbum : _Album = {
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

  // Seed data - Guest access (anyone can call, runs once)
  public shared ({ caller }) func seedData() : async () {
    if (seeded) { return () };
    seeded := true;

    let albumsData = [
      { name = "Urban Shadows"; desc = "Capturing city life."; photosCount = 3 },
      {
        name = "Wild Nature";
        desc = "Landscapes and wildlife.";
        photosCount = 3;
      },
      {
        name = "Intimate Portraits";
        desc = "People expressions.";
        photosCount = 3;
      },
    ];

    for (albumData in albumsData.values()) {
      let album : _Album = {
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
      // Urban Shadows
      { title = "Night Lights"; albumId = 0; desc = "City skyline" },
      { title = "Street Art"; albumId = 0; desc = "Graffiti" },
      { title = "Reflections"; albumId = 0; desc = "Puddles" },
      // Wild Nature
      { title = "Mountain Peaks"; albumId = 1; desc = "Mountains" },
      { title = "Forest Trail"; albumId = 1; desc = "Sunlight" },
      { title = "River Rapids"; albumId = 1; desc = "Water" },
      // Intimate Portraits
      { title = "Contemplation"; albumId = 2; desc = "Thinking" },
      { title = "Joyful Moment"; albumId = 2; desc = "Laughing" },
      { title = "Serenity"; albumId = 2; desc = "Peaceful" },
    ];

    for (photoData in photosData.values()) {
      let photo : _Photo = {
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

