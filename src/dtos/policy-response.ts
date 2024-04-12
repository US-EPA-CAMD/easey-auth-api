/*
Defining the properties as optional (?) so that the return JSON only has either
a 'policy' or failing that error messages in 'code' and 'message'.
 */
export class PolicyResponse {
  policy?: string;
  userId?: string;
  userRoleId?: number;

  //In case of errors, the following is the response
  code?: string;
  message?: string;

  constructor(init?: Partial<PolicyResponse>) {
    Object.assign(this, init);
  }
}