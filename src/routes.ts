import { Routes } from 'nest-router';

import { AuthModule } from './auth/auth.module';
import { ClientTokenModule } from './client-token/client-token.module';
import { TokenModule } from './token/token.module';

const routes: Routes = [
  {
    path: '/authentication',
    module: AuthModule,
  },
  {
    path: '/tokens',
    module: TokenModule,
    children: [
      {
        path: '/client',
        module: ClientTokenModule,
      }
    ]
  }
];

export default routes;
