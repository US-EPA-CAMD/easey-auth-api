export class SignAuthResponseDTO {

  activityId?: string;    //For /createActivity response

  documentIds?: string[];  //For /sign response

  //In case of errors
  code?: string;
  message?: string;
}
