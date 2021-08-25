import { Routes } from 'nest-router';

import { AuthenticationModule } from './authentication/authentication.module';
import { TokenModule } from './token/token.module';

const routes: Routes = [
  {
    path: '/authentication',
    module: AuthenticationModule,
  },
  {
    path: '/tokens',
    module: TokenModule,
  },
];

export default routes;
