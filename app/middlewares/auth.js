const auth = require("http-auth");
const config = require('../config/config');

function authenticateAdmin(req, res, next) {
  let authBasic = auth.basic({
      realm: config.admin['realm']
  }, function (username, password, callback) {
      callback(username === config.admin['username'] && password === config.admin['password']);
  });
  const callCheck = authBasic.check(() => {
      next();
  });
  callCheck(req, res);
}
exports.authenticateAdmin = authenticateAdmin;