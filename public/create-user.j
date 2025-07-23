const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const readline = require("readline");

const usersPath = path.join(__dirname, "users.json");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("הכנס שם משתמש: ", username => {
  rl.question("הכנס סיסמה: ", password => {
    rl.question("הכנס תפקיד (admin/user): ", role => {
      rl.question("הכנס צד משפחתי (Ben Abou/Malca/...): ", side => {
        bcrypt.hash(password, 10, (err, hash) => {
          if (err) throw err;

          const newUser = {
            username,
            password: hash,
            role,
            side
          };

          let users = [];
          if (fs.existsSync(usersPath)) {
            users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
          }

          users.push(newUser);
          fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), "utf8");

          console.log("המשתמש נוסף בהצלחה.");
          rl.close();
        });
      });
    });
  });
});
