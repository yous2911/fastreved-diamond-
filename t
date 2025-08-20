[1mdiff --git a/backend/env.backend b/backend/env.backend[m
[1mindex 6e56cd8..37d3689 100644[m
[1m--- a/backend/env.backend[m
[1m+++ b/backend/env.backend[m
[36m@@ -5,7 +5,7 @@[m
 # ===================================[m
 # SERVER CONFIGURATION[m
 # ===================================[m
[31m-NODE_ENV=production[m
[32m+[m[32mNODE_ENV=development[m[41m[m
 PORT=3003[m
 HOST=0.0.0.0[m
 TRUST_PROXY=true[m
[36m@@ -13,21 +13,12 @@[m [mTRUST_PROXY=true[m
 # ===================================[m
 # DATABASE CONFIGURATION[m
 # ===================================[m
[31m-DB_HOST=mysql[m
[32m+[m[32mDB_HOST=localhost[m[41m[m
 DB_PORT=3306[m
[31m-DB_USER=reved_user[m
[31m-DB_PASSWORD=CHANGE_ME_STRONG_DATABASE_PASSWORD[m
[31m-DB_NAME=reved_kids[m
[31m-DB_CONNECTION_LIMIT=50[m
[31m-[m
[31m-# Optional SSL configuration for database[m
[31m-DB_SSL=true[m
[31m-DB_SSL_CA=/path/to/ca-cert.pem[m
[31m-DB_SSL_KEY=/path/to/client-key.pem[m
[31m-DB_SSL_CERT=/path/to/client-cert.pem[m
[31m-[m
[31m-# MySQL Root Password (for backups and admin tasks)[m
[31m-MYSQL_ROOT_PASSWORD=CHANGE_ME_STRONG_ROOT_PASSWORD[m
[32m+[m[32mDB_USER=root[m[41m[m
[32m+[m[32mDB_PASSWORD=password[m[41m[m
[32m+[m[32mDB_NAME=reved_kids_diamond[m[41m[m
[32m+[m[32mDB_CONNECTION_LIMIT=20[m[41m[m
 [m
 # ===================================[m
 # REDIS CONFIGURATION (Optional but recommended)[m
