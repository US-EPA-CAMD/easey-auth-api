import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { RegistrationRole } from './registration-role';

export class RegistrationOrganization {
  private _organizationName: string;
  private _mailingAddress1: string;
  private _mailingAddress2: string;
  private _city: string;
  private _zip: string;
  private _email: string;
  private _phone: string;
  private _phoneExtension: string;
  private _fax: string;
  private _primaryOrg: boolean;
  private _mailingAddress3: string;
  private _mailingAddress4: string;
  private _userOrganizationId: number;
  private _organizationId: number;
  private _cdxEsaStatus: string;
  private _userRoleId: number;

  // Getters and Setters
  get organizationName(): string { return this._organizationName; }
  set organizationName(value: string) { this._organizationName = value; }

  get mailingAddress1(): string { return this._mailingAddress1; }
  set mailingAddress1(value: string) { this._mailingAddress1 = value; }

  get mailingAddress2(): string { return this._mailingAddress2; }
  set mailingAddress2(value: string) { this._mailingAddress2 = value; }

  get city(): string { return this._city; }
  set city(value: string) { this._city = value; }

  get zip(): string { return this._zip; }
  set zip(value: string) { this._zip = value; }

  get email(): string { return this._email; }
  set email(value: string) { this._email = value; }

  get phone(): string { return this._phone; }
  set phone(value: string) { this._phone = value; }

  get phoneExtension(): string { return this._phoneExtension; }
  set phoneExtension(value: string) { this._phoneExtension = value; }

  get fax(): string { return this._fax; }
  set fax(value: string) { this._fax = value; }

  get primaryOrg(): boolean { return this._primaryOrg; }
  set primaryOrg(value: boolean) { this._primaryOrg = value; }

  get mailingAddress3(): string { return this._mailingAddress3; }
  set mailingAddress3(value: string) { this._mailingAddress3 = value; }

  get mailingAddress4(): string { return this._mailingAddress4; }
  set mailingAddress4(value: string) { this._mailingAddress4 = value; }

  get userOrganizationId(): number { return this._userOrganizationId; }
  set userOrganizationId(value: number) { this._userOrganizationId = value; }

  get organizationId(): number { return this._organizationId; }
  set organizationId(value: number) { this._organizationId = value; }

  get cdxEsaStatus(): string { return this._cdxEsaStatus; }
  set cdxEsaStatus(value: string) { this._cdxEsaStatus = value; }

  get userRoleId(): number { return this._userRoleId; }
  set userRoleId(value: number) { this._userRoleId = value; }
}
