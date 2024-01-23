import { Injectable } from "@nestjs/common/decorators/core";
import { NestMiddleware } from "@nestjs/common/interfaces/middleware";

@Injectable()
export class ValidateHostMiddleWare implements NestMiddleware{
    use(req: any, res: any, next: (error?: any) => void) {
        const expectedHostName = ["[::1]:8000", "https://campd.epa.gov/", "https://api.epa.gov/", "https://api-easey.app.cloud.gov/", "localhost:8000"];
        const expectedXForwarededHostName = "";
        if (!expectedHostName.includes(req.headers.host)){
            return res.status(403).send('Unauthorized')
        }
        next();
    }
}
