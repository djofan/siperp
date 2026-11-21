import { hasAnyRole, hasRole, type RoleViewer } from "./permissions";

// Shared by the badge and the destination list: the same task must use the same scope.
export function taskScope(viewer: RoleViewer, task?: "survey" | "distribution") {
  if (hasRole(viewer, "admin")) return undefined;
  if (task === "survey" && hasRole(viewer, "verifier")) return task;
  if (task === "distribution" && hasAnyRole(viewer, ["verifier", "volunteer", "treasurer"])) return task;
  return undefined;
}
