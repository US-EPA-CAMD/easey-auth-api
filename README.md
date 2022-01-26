
# EASEY Auth API
[![GitHub](https://img.shields.io/github/license/US-EPA-CAMD/easey-auth-api)](https://github.com/US-EPA-CAMD/easey-auth-api/blob/develop/LICENSE.md)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=US-EPA-CAMD_easey-auth-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=US-EPA-CAMD_easey-auth-api)
[![Develop Branch Pipeline](https://github.com/US-EPA-CAMD/easey-auth-api/workflows/Develop%20Branch%20Workflow/badge.svg)](https://github.com/US-EPA-CAMD/easey-auth-api/actions)<br>
Authentication & Authorization API for the EPA CAMD Business Systems EASEY Application

## Getting Started

Follow these [instructions](https://github.com/US-EPA-CAMD/devops/blob/master/GETTING_STARTED.md) to get the project up and running correctly.

## API Endpoints

Please refer to the [Auth Management API Swagger Documentation](https://api-easey-dev.app.cloud.gov/auth-mgmt/swagger/) for descriptions of the endpoints.

## CDX Services

​The Auth Api makes use of the government provided [cdx soap](https://testngn.epacdxnode.net/cdx-register-II/documentation) services. By importing`createClientAsync from "soap"` a user created service can make a connection to any soap api, provided they have the correct security token. A call to `createClientAsync` will return a client object, and that client object can reference any of the api endpoints within that service category, while passing in the required authentication token. Here is an example of the Authenticate endpoint being called asynchronously. 

```
const  url = `${this.configService.get<string>('app.cdxSvcs',)}/RegisterAuthService?wsdl`;
createClientAsync(url).then(client  => {
	return  client.AuthenticateAsync({
		userId,
		password,
	});
}).then(result => {})
```

Before using most endpoints that are part of the majority of soap services, authentication to that particular service must be performed, and the token returned from authenticating to that service must be passed with each request. 

For example, to receive a user's primary organization, first you must authenticate against the StreamlinedRegistrationService. In this example a `naasAppId` and  `naasAppPwd` are required to make this authentication.  

```
const  url = `${this.configService.get<string>('app.cdxSvcs',)}/StreamlinedRegistrationService?wsdl`;

return createClientAsync(url).then(client  => {
	return  client.AuthenticateAsync({
		userId:  this.configService.get<string>('app.naasAppId'),
		credential:  this.configService.get<string>('app.nassAppPwd'),
	});
})
.then(res  => {
	return  res[0].securityToken;
})
```

Once the token has been stored / returned, any request in the StreamlinedRegistrationService can be executed. For instance, retrieving a users primary organization: 

```
const  url = `${this.configService.get<string>(
'app.cdxSvcs',
)}/StreamlinedRegistrationService?wsdl`;

return  createClientAsync(url).then(client  => {
	return  client.RetrievePrimaryOrganizationAsync({
		securityToken:  RETRIEVED_TOKEN_ABOVE,
		user: { userId:  userId },
	});
})
.then(res  => {
return  res[0].result.email;
})
```

## License & Contributing
​
This project is licensed under the MIT License. We encourage you to read this project’s [License](https://github.com/US-EPA-CAMD/devops/blob/master/LICENSE), [Contributing Guidelines](https://github.com/US-EPA-CAMD/devops/blob/master/CONTRIBUTING.md), and [Code of Conduct](https://github.com/US-EPA-CAMD/devops/blob/master/CODE_OF_CONDUCT.md).

## Disclaimer
The United States Environmental Protection Agency (EPA) GitHub project code is provided on an "as is" basis and the user assumes responsibility for its use. EPA has relinquished control of the information and no longer has responsibility to protect the integrity , confidentiality, or availability of the information. Any reference to specific commercial products, processes, or services by service mark, trademark, manufacturer, or otherwise, does not constitute or imply their endorsement, recommendation or favoring by EPA. The EPA seal and logo shall not be used in any manner to imply endorsement of any commercial product or activity by EPA or the United States Government.

