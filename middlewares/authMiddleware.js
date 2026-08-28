import usersData from "../usersDB.json" with { type: "json" };

export function checkAuth(req, res, next) {
  const { uid } = req.cookies;
  const loggedInUser = usersData.find((user) => user.id === uid);
  if (!uid || !loggedInUser) {
    return res.status(401).json({ message: "Not an valid user" });
  }
  req.user = loggedInUser;
  next();
}
