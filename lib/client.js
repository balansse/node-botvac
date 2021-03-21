const retry = require('async-await-retry');
const api = require('./api.js');
const Robot = require('./robot.js');

/**
 * Initializes a botvac client with an authorization token.
 * @param {String} t - Token used to authorize calls to Neato API.
 * @param {String} [tokenType] - Token type, optional. Valid values: OAuth, token must be an OAuth access token, see https://developers.neatorobotics.com/guides/oauth-flow. Any other token type value requires a session token issued by a login with email and password.
 */
class Client {
    constructor(t, tokenType) {
        this._baseUrl = 'https://beehive.neatocloud.com';
        this._token = t;
        switch (tokenType) {
            case 'OAuth':
                this._tokenType = 'Bearer ';
                break;
            default:
                this._tokenType = 'Token token=';
                break;
        }
    }

    async authorize(email, password, force) {
        if (!this._token || force) {
            let body;
            try {
                body = await api.request(`${this._baseUrl}/sessions`, {email: email, password: password}, 'POST', null);
            }
            catch (err) {
                console.log('Could not authenticate, retrying in 5s...')
                await new Promise(r => setTimeout(r, 5000));
                return authorize(email, password, true);
            }

            if (body.data.access_token) {
                this._token = body.data.access_token;
            } else if (body.data.message) {
                throw new Error(body.data.message);
            } else {
                return 
            }
            // //DEBUG
            // let robots = await this.getRobots();
            // await robots[0].startSpotCleaning();
            // await robots[0].stopCleaning();
            // //
            // return;
        }
    }

    async getRobots() {
        if (this._token) {
            let body;

            try {
                body = await retry(async () => await api.request(`${this._baseUrl}/users/me/robots`, null, 'GET', {Authorization: this._tokenType + this._token}));
            }
            catch (err) {
                throw new Error(err);
            }

            if (body.data.message) {
                throw new Error(body.message);
            } 

            let robots = [];
            for (var i = 0; i < body.data.length; i++) {
                let robotData = body.data[i];
                let robot = new Robot(robotData.name, robotData.serial, robotData.secret_key, this._tokenType + this._token);
                
                try {
                    await retry(async () => await robot.getState());
                } catch (err) {
                    console.log(`Failed getting robot ${robotData.name} state:`, err);
                }

                robots.push(robot);
            }            

            return robots;

        } else {
            throw new Error('Not authorized');
        }
    };

}

module.exports = Client;