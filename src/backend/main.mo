import Map "mo:core/Map";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Runtime "mo:core/Runtime";
import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinStorage();

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  type AlbumId = Text;
  type PhotoId = Text;

  public type Album = {
    id : AlbumId;
    name : Text;
    description : Text;
    coverBlobId : ?Text;
    createdAt : Int;
    photoCount : Nat;
  };

  public type Photo = {
    id : PhotoId;
    title : Text;
    description : Text;
    albumId : AlbumId;
    blobId : Text;
    uploadedAt : Int;
  };

  public type UserProfile = {
    name : Text;
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

  // State
  let albums = Map.empty<AlbumId, Album>();
  let photos = Map.empty<PhotoId, Photo>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var seeded = false;

  // Registration Function (NO auth check - anyone can call)
  public shared ({ caller }) func registerAsAdmin() : async () {
    // Pass empty strings for token arguments (unused in this context)
    AccessControl.initialize(accessControlState, caller, "", "");
  };

  // User Profile Functions

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Queries

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

  // Helper to get current timestamp
  func timestamp() : Int {
    Time.now();
  };

  // Admin updates

  public shared ({ caller }) func createAlbum(name : Text, description : Text) : async Album {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create albums");
    };

    let id = name;
    let album : Album = {
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
      Runtime.trap("Unauthorized: Only admins can update albums");
    };

    switch (albums.get(id)) {
      case (null) { false };
      case (?oldAlbum) {
        let updatedAlbum : Album = {
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
      Runtime.trap("Unauthorized: Only admins can delete albums");
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

  public shared ({ caller }) func addPhoto(title : Text, description : Text, albumId : AlbumId, blobId : Text) : async ?Photo {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add photos");
    };

    switch (albums.get(albumId)) {
      case (null) { null };
      case (?_) {
        let id = title # timestamp().toText() # blobId;
        let photo : Photo = {
          id;
          title;
          description;
          albumId;
          blobId;
          uploadedAt = timestamp();
        };

        photos.add(id, photo);

        // Update album photo count
        switch (albums.get(albumId)) {
          case (?album) {
            let updatedAlbum : Album = {
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

  public shared ({ caller }) func updatePhoto(id : PhotoId, title : Text, description : Text, albumId : AlbumId) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update photos");
    };

    switch (photos.get(id)) {
      case (null) { false };
      case (?oldPhoto) {
        let updatedPhoto : Photo = {
          oldPhoto with
          title;
          description;
          albumId;
        };
        photos.add(id, updatedPhoto);
        true;
      };
    };
  };

  public shared ({ caller }) func deletePhoto(id : PhotoId) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete photos");
    };

    switch (photos.get(id)) {
      case (null) { false };
      case (?photo) {
        photos.remove(id);

        // Update album photo count
        switch (albums.get(photo.albumId)) {
          case (?album) {
            let updatedAlbum : Album = {
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

  // Seed data (runs once, public)
  public shared ({ caller }) func seedData() : async () {
    if (seeded) { return () };
    seeded := true;

    let album1 : Album = {
      id = "Urban Shadows";
      name = "Urban Shadows";
      description = "Capturing city life and architecture.";
      coverBlobId = ?"demo";
      createdAt = timestamp();
      photoCount = 3;
    };

    let album2 : Album = {
      id = "Wild Nature";
      name = "Wild Nature";
      description = "Landscapes, wildlife, and outdoor adventures.";
      coverBlobId = ?"demo";
      createdAt = timestamp();
      photoCount = 3;
    };

    let album3 : Album = {
      id = "Intimate Portraits";
      name = "Intimate Portraits";
      description = "Expressions and moments in people's lives.";
      coverBlobId = ?"demo";
      createdAt = timestamp();
      photoCount = 3;
    };

    albums.add(album1.id, album1);
    albums.add(album2.id, album2);
    albums.add(album3.id, album3);

    // Photos for Urban Shadows
    let urbanPhotos : [Photo] = [
      {
        id = "photo1-urban";
        title = "Night Lights";
        description = "City skyline at dusk.";
        albumId = "Urban Shadows";
        blobId = "demo";
        uploadedAt = timestamp();
      },
      {
        id = "photo2-urban";
        title = "Street Art";
        description = "Graffiti in alleyway.";
        albumId = "Urban Shadows";
        blobId = "demo";
        uploadedAt = timestamp();
      },
      {
        id = "photo3-urban";
        title = "Reflections";
        description = "Buildings reflected in puddles.";
        albumId = "Urban Shadows";
        blobId = "demo";
        uploadedAt = timestamp();
      },
    ];

    // Photos for Wild Nature
    let wildNaturePhotos : [Photo] = [
      {
        id = "photo1-nature";
        title = "Mountain Peaks";
        description = "Snow-capped mountain range.";
        albumId = "Wild Nature";
        blobId = "demo";
        uploadedAt = timestamp();
      },
      {
        id = "photo2-nature";
        title = "Forest Trail";
        description = "Sunlight through trees.";
        albumId = "Wild Nature";
        blobId = "demo";
        uploadedAt = timestamp();
      },
      {
        id = "photo3-nature";
        title = "River Rapids";
        description = "Water splashing over rocks.";
        albumId = "Wild Nature";
        blobId = "demo";
        uploadedAt = timestamp();
      },
    ];

    // Photos for Intimate Portraits
    let intimatePortraitsPhotos : [Photo] = [
      {
        id = "photo1-portraits";
        title = "Contemplation";
        description = "Person lost in thought.";
        albumId = "Intimate Portraits";
        blobId = "demo";
        uploadedAt = timestamp();
      },
      {
        id = "photo2-portraits";
        title = "Joyful Moment";
        description = "Child laughing.";
        albumId = "Intimate Portraits";
        blobId = "demo";
        uploadedAt = timestamp();
      },
      {
        id = "photo3-portraits";
        title = "Serenity";
        description = "Peaceful expression.";
        albumId = "Intimate Portraits";
        blobId = "demo";
        uploadedAt = timestamp();
      },
    ];

    // Add all photos
    for (photo in urbanPhotos.values()) {
      photos.add(photo.id, photo);
    };
    for (photo in wildNaturePhotos.values()) {
      photos.add(photo.id, photo);
    };
    for (photo in intimatePortraitsPhotos.values()) {
      photos.add(photo.id, photo);
    };
  };
};
