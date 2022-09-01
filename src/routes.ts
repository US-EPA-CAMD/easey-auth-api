import { Routes } from 'nest-router';

import { TokenModule } from './token/token.module';

const routes: Routes = [
  {
    path: '/tokens',
    module: TokenModule,
  },
];

export default routes;
