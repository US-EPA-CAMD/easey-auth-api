import { Routes } from "nest-router";

import { AuthenticationModule } from "./authentication/authentication.module";

const routes: Routes = [
  {
    path: '/authentication',
    module: AuthenticationModule,
  },
];

export default routes;