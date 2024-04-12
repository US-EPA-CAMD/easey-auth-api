export class RegistrationRole {
  private userRoleId: number;
  private dataflow: string;
  private subject: string;

  constructor(userRoleId: number, dataflow: string, subject: string) {
    this.userRoleId = userRoleId;
    this.dataflow = dataflow;
    this.subject = subject;
  }

  // Getter methods to allow external access to private properties if necessary
  public getUserRoleId(): number {
    return this.userRoleId;
  }

  public getDataflow(): string {
    return this.dataflow;
  }

  public getSubject(): string {
    return this.subject;
  }

  // Setter methods if modification of the properties is required
  public setUserRoleId(userRoleId: number): void {
    this.userRoleId = userRoleId;
  }

  public setDataflow(dataflow: string): void {
    this.dataflow = dataflow;
  }

  public setSubject(subject: string): void {
    this.subject = subject;
  }
}
