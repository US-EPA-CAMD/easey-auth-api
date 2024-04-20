// Define CodeDescription for handling the status object in Role
export class CodeDescription {
  private code: string;
  private description: string;

  // Constructor
  constructor(code: string, description: string) {
    this.code = code;
    this.description = description;
  }

  // Getters and Setters
  getCode(): string { return this.code; }
  setCode(value: string): void { this.code = value; }
  getDescription(): string { return this.description; }
  setDescription(value: string): void { this.description = value; }
}

// Define RoleType for handling the type object in Role
export class RoleType {
  private code: number;
  private description: string;
  private status: string;
  private esaRequirement: string;
  private signatureQuestionsRequired: boolean;
  private manageFacilities: boolean;

  // Constructor
  constructor(code: number, description: string, status: string, esaRequirement: string, signatureQuestionsRequired: boolean, manageFacilities: boolean) {
    this.code = code;
    this.description = description;
    this.status = status;
    this.esaRequirement = esaRequirement;
    this.signatureQuestionsRequired = signatureQuestionsRequired;
    this.manageFacilities = manageFacilities;
  }

  // Getters and Setters
  getCode(): number { return this.code; }
  setCode(value: number): void { this.code = value; }
  getDescription(): string { return this.description; }
  setDescription(value: string): void { this.description = value; }
  getStatus(): string { return this.status; }
  setStatus(value: string): void { this.status = value; }
  getEsaRequirement(): string { return this.esaRequirement; }
  setEsaRequirement(value: string): void { this.esaRequirement = value; }
  isSignatureQuestionsRequired(): boolean { return this.signatureQuestionsRequired; }
  setSignatureQuestionsRequired(value: boolean): void { this.signatureQuestionsRequired = value; }
  isManageFacilities(): boolean { return this.manageFacilities; }
  setManageFacilities(value: boolean): void { this.manageFacilities = value; }
}

// Define Role to encapsulate the role data
export class Role {
  private userRoleId: number;
  private dataflow: string;
  private status: CodeDescription;
  private type: RoleType;
  private subject: string;

  // Constructor
  constructor(userRoleId: number, dataflow: string, status: CodeDescription, type: RoleType, subject: string) {
    this.userRoleId = userRoleId;
    this.dataflow = dataflow;
    this.status = status;
    this.type = type;
    this.subject = subject;
  }

  // Getters and Setters
  getUserRoleId(): number { return this.userRoleId; }
  setUserRoleId(value: number): void { this.userRoleId = value; }
  getDataflow(): string { return this.dataflow; }
  setDataflow(value: string): void { this.dataflow = value; }
  getStatus(): CodeDescription { return this.status; }
  setStatus(value: CodeDescription): void { this.status = value; }
  getType(): RoleType { return this.type; }
  setType(value: RoleType): void { this.type = value; }
  getSubject(): string { return this.subject; }
  setSubject(value: string): void { this.subject = value; }
}
