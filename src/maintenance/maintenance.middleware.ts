import { Injectable, NestMiddleware, HttpStatus, } from '@nestjs/common';
import { firstValueFrom } from "rxjs";
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { HttpService } from "@nestjs/axios";
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {

    constructor(private readonly configService: ConfigService, private readonly httpService: HttpService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            const appStatus = this.configService.get('app.appStatus');
            const errorMessage = "The server is temporarily unable to service your request due to maintenance. Please try again later."

            if (appStatus === "DOWN") {
                throw new EaseyException(new Error(errorMessage), HttpStatus.SERVICE_UNAVAILABLE);
            } else if (appStatus === "TEST") {
                // /auth-mgmt/tokens/client desnot have x-client-token;
                if (!req.headers['x-client-token'] && req.path !== '/auth-mgmt/tokens/client') {
                    throw new EaseyException(new Error(errorMessage), HttpStatus.SERVICE_UNAVAILABLE);
                }

                const skipURL = ['/auth-mgmt/authentication/login-state', '/auth-mgmt/authentication/sign-in', '/auth-mgmt/authentication/determinePolicy', '/auth-mgmt/tokens/client/validate', '/auth-mgmt/tokens/client'];

                if (!skipURL.includes(req.path)) {
                    const fromECMPSAPP = await this.clientValidateRequest(req);
                    if (!fromECMPSAPP) {
                        throw new EaseyException(new Error(errorMessage), HttpStatus.SERVICE_UNAVAILABLE);
                    }
                    // TODO: CHECK USER
                    // const userValidation = await this.tockenValidateRequest(req);
                }
            }

            next();
        } catch (err) {
            next(err);
        }

    }

    async validateClientToken(clientId: string, clientToken: string): Promise<any> {
        const apiKey = this.configService.get("app.apiKey");
        const url =
            this.configService.get("app.authApi").uri + "/tokens/client/validate";

        try {
            const result = await firstValueFrom(
                this.httpService.post(
                    url,
                    { clientId },
                    {
                        headers: {
                            authorization: `Bearer ${clientToken}`,
                            "x-api-key": apiKey,
                            "x-client-token": `Bearer ${clientToken}`
                        },
                    }
                )
            );

            if (result.data) {
                return true;
            }

            return false;
        } catch (error) {
            if (error.response) {
                throw new EaseyException(
                    new Error(
                        "An error occurred while validating the client's security token."
                    ),
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    error
                );
            }
        }
    }

    async clientValidateRequest(request): Promise<boolean> {
        const clientToken = request.headers['x-client-token'];
        const clientIdHeader = request.headers["x-client-id"];
        const splitString = clientToken.split(" ");

        if (await this.validateClientToken(clientIdHeader, splitString[1])) {
            return true;
        }

        return false;
    }


    async validateToken(token: string, ip: string): Promise<any> {
        const apiKey = this.configService.get("app.apiKey");
        const url = this.configService.get("app.authApi").uri + "/tokens/validate";

        try {
            const result = await firstValueFrom(
                this.httpService.post(url, null, {
                    headers: {
                        authorization: `Bearer ${token}`,
                        "x-forwarded-for": ip,
                        "x-api-key": apiKey,
                    },
                })
            );

            return result.data;
        } catch (error) {
            if (error.response) {
                throw new EaseyException(
                    new Error(
                        "An error occurred in while validating the user's security token."
                    ),
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    error
                );
            }
        }
    }

    async tockenValidateRequest(request): Promise<boolean> {
        const authHeader = request.headers.authorization;
        const forwardedForHeader = request.headers["x-forwarded-for"];
        const splitString = authHeader.split(" ");
        let ip = request.ip;

        if (forwardedForHeader !== null && forwardedForHeader !== undefined) {
            ip = forwardedForHeader.split(",")[0];
        }

        const validatedToken = await this.validateToken(splitString[1], ip);

        request.user = validatedToken;

        return true;
    }

}
