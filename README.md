
# Authentication & Authorization API

[![License](https://img.shields.io/github/license/US-EPA-CAMD/easey-auth-api)](https://github.com/US-EPA-CAMD/easey-auth-api/blob/develop/LICENSE)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=US-EPA-CAMD_easey-auth-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=US-EPA-CAMD_easey-auth-api)
[![Develop CI/CD](https://github.com/US-EPA-CAMD/easey-auth-api/workflows/Develop%20Branch%20Workflow/badge.svg)](https://github.com/US-EPA-CAMD/easey-auth-api/actions)
[![Release CI/CD](https://github.com/US-EPA-CAMD/easey-auth-api/workflows/Release%20Branch%20Workflow/badge.svg)](https://github.com/US-EPA-CAMD/easey-auth-api/actions)
![Issues](https://img.shields.io/github/issues/US-EPA-CAMD/easey-auth-api)
![Forks](https://img.shields.io/github/forks/US-EPA-CAMD/easey-auth-api)
![Stars](https://img.shields.io/github/stars/US-EPA-CAMD/easey-auth-api)
[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/US-EPA-CAMD/easey-auth-api)

## Description
Authentication & Authorization API for the EPA CAMD Business Systems EASEY Application

## Getting Started
Follow these [instructions](https://github.com/US-EPA-CAMD/devops/blob/master/GETTING-STARTED.md) to get the project up and running correctly.

## Installing
1. Open a terminal and navigate to the directory where you wish to store the repository.
2. Clone the repository using one of the following git cli commands or using your favorit Git management software<br>
    **Using SSH**
    ```
    $ git clone git@github.com:US-EPA-CAMD/easey-auth-api.git
    ```
    **Using HTTPS**
    ```
    $ git clone https://github.com/US-EPA-CAMD/easey-auth-api.git
    ```
3. Navigate to the projects root directory
    ```
    $ cd easey-emissions-api
    ```
4. Install package dependencies
    ```
    $ yarn install
    ```

## Building, Testing, & Running the application
From within the projects root directory run the following commands using the yarn command line interface

**Run in development mode**
```
$ yarn start:dev
```

**Install/update package dependencies & run in development mode**
```
$ yarn up
```

**Unit tests**
```
$ yarn test
```

**Build**
```
$ yarn build
```

**Run in production mode**
```
$ yarn start
```

## API Endpoints
Please refer to the auth Management API Swagger Documentation for descriptions of the endpoints.<br>
[Dev Environment](https://api.epa.gov/easey/dev/auth-mgmt/swagger/) | [Test Environment](https://api.epa.gov/easey/test/auth-mgmt/swagger/) | [Beta Environment](https://api.epa.gov/easey/beta/auth-mgmt/swagger/) | [Staging Environment](https://api.epa.gov/easey/staging/auth-mgmt/swagger/)

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
This project is licensed under the MIT License. We encourage you to read this project’s [License](LICENSE), [Contributing Guidelines](CONTRIBUTING.md), and [Code of Conduct](CODE-OF-CONDUCT.md).

## Disclaimer
The United States Environmental Protection Agency (EPA) GitHub project code is provided on an "as is" basis and the user assumes responsibility for its use. EPA has relinquished control of the information and no longer has responsibility to protect the integrity , confidentiality, or availability of the information. Any reference to specific commercial products, processes, or services by service mark, trademark, manufacturer, or otherwise, does not constitute or imply their endorsement, recommendation or favoring by EPA. The EPA seal and logo shall not be used in any manner to imply endorsement of any commercial product or activity by EPA or the United States Government.
