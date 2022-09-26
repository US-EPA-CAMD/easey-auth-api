import { Routes } from 'nest-router';

import { ClientTokenModule } from './client-token/client-token.module';

const routes: Routes = [
  {
    path: '/tokens/client',
    module: ClientTokenModule,
  },
];

export default routes;
