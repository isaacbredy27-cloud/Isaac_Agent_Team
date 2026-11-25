import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { authRoutes } from "../auth";
import { Layout } from "./Layout";
import { JobsPage } from "./JobsPage";
import { JobDetailPage } from "./JobDetailPage";
import { ResumePage } from "./ResumePage";
import { GapsPage } from "./GapsPage";
import { HowItWorksPage, NotFoundPage, ResourcesPage } from "./StaticPages";

const children: RouteObject[] = [
  { index: true, element: <JobsPage /> },
  { path: "jobs", element: <JobsPage /> },
  { path: "jobs/:id", element: <JobDetailPage /> },
  { path: "resume", element: <ResumePage /> },
  { path: "gaps", element: <GapsPage /> },
  { path: "how-it-works", element: <HowItWorksPage /> },
  { path: "resources", element: <ResourcesPage /> },
  ...authRoutes.map((r): RouteObject => ({ path: r.path, element: r.element })),
  { path: "*", element: <NotFoundPage /> },
];

export const router = createBrowserRouter([{ id: "root", path: "/", element: <Layout />, children }], {
  // Console code loads only when someone opens /agents (keeps route JS small).
  async patchRoutesOnNavigation({ path, patch }) {
    if (path.startsWith("/agents")) {
      const { consoleRoutes } = await import("../console");
      patch("root", consoleRoutes);
    }
  },
});
