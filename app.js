const express = require("express");
const app = express();
const h = require("./helpers");
const { User } = require("./models");

// .env
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Templates
const expressHandlebars = require("express-handlebars");
const hbs = expressHandlebars.create({
  partialsDir: "views/",
  defaultLayout: "application",
  helpers: require("./helpers")
});
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

// Method Overriding
const methodOverride = require("method-override");
const getPostSupport = require("express-method-override-get-post-support");
app.use(methodOverride(getPostSupport.callback, getPostSupport.options));

// Static Files
app.use(express.static(`${__dirname}/public`));

// Post Data
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// Session
const expressSession = require("express-session");
app.use(
  expressSession({
    resave: false,
    saveUninitialized: true,
    secret: "asdf;werxcklj;jxcvui3qksf;"
  })
);

// Flash
const flash = require("express-flash-messages");
app.use(flash());

// Log Request Info in Development
if (process.env.NODE_ENV === "development") {
  const morgan = require("morgan");
  const morganToolkit = require("morgan-toolkit")(morgan);
  app.use(morganToolkit());
}

// Connect to Mongoose
const mongoose = require("mongoose");
app.use((req, res, next) => {
  if (mongoose.connection.readyState) next();
  else require("./mongo")().then(() => next());
});

// Authentication Middleware
const passport = require("passport");

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(userId, done) {
  User.findById(userId, (err, user) => done(err, user));
});

passport.use("local", require("./strategies/local"));

passport.use("bearer", require("./strategies/bearer"));

// Add populated user and referral URL to locals
app.use(async (req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
  }
  next();
});

// Routes
app.use("/", require("./routes")(passport));
app.use(
  "/api/v1",
  passport.authenticate("bearer", { session: false }),
  require("./routes/apiV1")
);

// Set up port/host
const port = process.env.PORT || process.argv[2] || 3000;
const host = "localhost";
let args = process.env.NODE_ENV === "production" ? [port] : [port, host];

// helpful log when the server starts
args.push(() => {
  console.log(`Listening: http://${host}:${port}`);
});

// Use apply to pass the args to listen if we're run directly
if (require.main === module) {
  app.listen.apply(app, args);
}

module.exports = app;
