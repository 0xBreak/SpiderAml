import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware wrappers around Next.js navigation APIs.
// `Link href="/check"` renders `/check` for ru and `/en/check` for en.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
