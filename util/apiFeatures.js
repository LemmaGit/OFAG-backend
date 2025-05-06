export function sort(queryString, query) {
  const { sort } = queryString;
  if (!sort) return query;
  let sortBy = Object.values(sort).length > 1 ? sort.join(" ") : sort;
  return query.sort(sortBy);
}
export function project(queryString, query) {
  const projectThis = ["-__v"];
  const { project } = queryString;
  if (!project) return query;
  projectThis.push(
    Object.values(project).length > 1 ? project.join(" ") : project
  );
  return query.select(projectThis.join(" "));
}
export async function paginate(queryString, query, Model) {
  const page = +queryString.page || 1;
  const limit = +queryString.limit || 100;
  const skip = (page - 1) * limit;
  //! If they make the skip value -ve this might crash the app
  query = query.skip(skip).limit(limit);
  if (queryString.page) {
    const numdoc = await Model.countDocuments();
    if (skip >= numdoc) throw new Error("Page doesn't exist");
  }
  return query;
}
