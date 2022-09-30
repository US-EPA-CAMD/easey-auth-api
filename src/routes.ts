import { Routes } from 'nest-router';

import { TokenModule } from './token/token.module';
import { ClientTokenModule } from './client-token/client-token.module';

const routes: Routes = [
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
