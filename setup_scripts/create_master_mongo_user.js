db = db.getSiblingDB('admin')
db.addUser( { user: "master", pwd: "arghh", roles: [ "userAdminAnyDatabase" ] } )
exit
