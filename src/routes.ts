import { Routes } from 'nest-router';

import { AuthModule } from './auth/auth.module';
import { CertificationsModule } from './certifications/certifications.module';
import { ClientTokenModule } from './client-token/client-token.module';
import { SignModule } from './sign/Sign.module';
import { TokenModule } from './token/token.module';

const routes: Routes = [
  {
    path: '/authentication',
    module: AuthModule,
  },
  {
    path: '/sign',
    module: SignModule,
  },
  {
    path: '/certifications',
    module: CertificationsModule,
  },
  {
    path: '/tokens',
    module: TokenModule,
    children: [
      {
        path: '/client',
        module: ClientTokenModule,
      },
    ],
  },
];

export default routes;
