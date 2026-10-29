# Academy UI

The button, card, badge, input, textarea, table, and sheet components are installed
from the official shadcn/ui New York registry:
https://ui.shadcn.com/r/styles/new-york/{component}.json

Theme tokens use the `academy-` prefix. Values are scoped in `../dashboard.css`;
their Tailwind utility mappings are registered in `app/globals.css`.
Keep these tokens scoped to Academy when updating registry components so other
modules retain their existing themes. `utils.ts` uses clsx and tailwind-merge.

The compatibility wrappers preserve existing Academy form and table APIs while
rendering shadcn components. New screens can use registry components directly.
Sheet uses Radix Dialog for focus trapping, Escape handling, and focus restoration.
