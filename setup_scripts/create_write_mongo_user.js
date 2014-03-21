use admin
db.auth('master', 'arghh')
use wynno-prod
db.addUser( { user: "dude", pwd: "blahblah", roles: [ "readWrite", "dbAdmin" ]} )
exit
