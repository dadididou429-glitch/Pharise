# قواعد Firestore النهائية — انشرها في Firebase

Firebase Console → Firestore → Rules → الصق → ضع UID الأدمن → Publish

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
        && request.auth.uid == "REPLACE_WITH_YOUR_ADMIN_UID";
    }

    match /pharmacies_submitted/{docId} {
      allow read: if true;
      allow create: if request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.name.size() <= 80
        && request.resource.data.address is string
        && request.resource.data.address.size() > 0
        && request.resource.data.address.size() <= 200
        && request.resource.data.verified == false
        && request.resource.data.featured != true;
      allow update, delete: if isAdmin();
    }

    match /removed_pharmacies/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /pharmacy_features/{docId} {
      allow read: if true;
      allow create: if request.resource.data.featured == true
        && request.resource.data.keys().hasOnly(
             ["featured", "verified", "activatedAt", "code"]
           );
      allow update, delete: if isAdmin();
    }

    match /activation_codes/{codeId} {
      allow get: if true;
      allow list: if false;
      allow create: if request.resource.data.used == false
        && request.resource.data.keys().hasAll(["used"]);
      allow update: if resource.data.used == false
        && request.resource.data.used == true
        && request.resource.data.diff(resource.data)
             .affectedKeys()
             .hasOnly(["used", "usedAt", "pharmacyName", "wilaya", "pharmacyId"]);
      allow delete: if isAdmin();
    }

    match /complaints/{docId} {
      allow read: if true;
      allow create: if request.resource.data.count == 1;
      allow update: if isAdmin()
        || (
          request.resource.data.count == resource.data.count + 1
          && request.resource.data.diff(resource.data).affectedKeys()
               .hasOnly(["count", "name", "lastReportAt"])
        );
      allow delete: if isAdmin();
    }

    match /ratings/{docId} {
      allow read: if true;
      allow write: if request.resource.data.sum is number
        && request.resource.data.count is number;

      match /reviews/{reviewId} {
        allow read: if true;
        allow create: if request.resource.data.stars is number
          && request.resource.data.stars >= 1
          && request.resource.data.stars <= 5
          && (!("text" in request.resource.data)
              || request.resource.data.text.size() <= 300);
        allow update, delete: if isAdmin();
      }
    }
  }
}
```

## UID الأدمن
Authentication → Users → انسخ User UID وضعها بدل REPLACE_WITH_YOUR_ADMIN_UID
