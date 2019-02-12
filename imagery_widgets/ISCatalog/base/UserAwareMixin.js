//////////////////////////////////////////////////////////////////////////////
// Copyright 2013 Esri
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//////////////////////////////////////////////////////////////////////////////

define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "esri/IdentityManager",
        "dojo/Deferred",
        "./BaseDiscoveryMixin"
    ],
    function (declare, lang, IdentityManager, Deferred, BaseDiscoveryMixin) {
        return declare([BaseDiscoveryMixin], {
            constructor: function () {
                this.userInformation = null;
                this.userPortal = null;
                this.portalSelfCache = {};
            },
            /**
             * loads the users info and portal account info from their organization
             */
            loadUserAndPortal: function () {
                var currentTime, credential, def = new Deferred();
                credential = IdentityManager.findCredential(this.portalUrl);
                if (credential) {
                    currentTime = new Date().getTime();
                    if (credential.expires <= currentTime) {
                        this._clearUser();
                        credential.refreshToken().then(lang.hitch(this, this._loadUserAndPortal, def));
                        return def;
                    }
                }
                if (this.userInformation && this.userPortal && credential.token) {
                    def.resolve({user: this.userInformation, portal: this.userPortal, token: credential.token});
                }
                else {
                    this._loadUserAndPortal(def);
                }
                return def;
            },
            _loadUserAndPortal: function (def) {
                this.loadUserSelf().then(lang.hitch(this,
                    function (userAndToken) {
                        if (!userAndToken || userAndToken.error) {
                            var userErrorResponse = {};
                            userErrorResponse.error = true;
                            userErrorResponse.message = userAndToken.message;
                            def.resolve(userErrorResponse);
                            return;
                        }
                        this._handleLoadUsersPortal(userAndToken.user).then(lang.hitch(this, function (portal) {
                            var responseObject;
                            if (!portal || portal.error) {
                                responseObject = {};
                                responseObject.error = true;
                                responseObject.message = portal.message;
                            }
                            else {
                                responseObject = {user: userAndToken.user, portal: portal, token: userAndToken.token, credential: userAndToken.credential};
                            }
                            def.resolve(responseObject);
                        }));
                    }));
            },
            _clearUser: function () {
                this.userInformation = null;
                this.userPortal = null;
            },
            /**
             * loads the users info from their organization portal
             * @returns {dojo.Deferred}
             */
            loadUserSelf: function () {
                var def, credential, url, params;
                def = new Deferred();
                credential = IdentityManager.findCredential(this.portalUrl);
                url = this.joinUrl(this.portalUrl, "sharing/community/self");
                if (!credential || !credential.token) {
                    def.resolve({user: null, token: null, credential: null, error: true});
                    return def;
                }
                params = {f: "json", token: credential.token};
                this.loadJsonP(url, params, lang.hitch(this, function (user) {
                        this._handleUserSelfResponse(user);
                        def.resolve({user: user, token: credential.token, credential: credential});
                    }),
                    lang.hitch(this, function (errorResponse) {
                        def.resolve({error: true, message: errorResponse ? errorResponse.message : "Error retrieving user account"});
                    })
                );
                return def;
            },
            loadPortalSelf: function (portalUrl) {
                var def = new Deferred(), credential, url, params;
                if (this.portalSelfCache[portalUrl]) {
                    def.resolve({portal: this.portalSelfCache[portalUrl]});
                }
                else {
                    credential = IdentityManager.findCredential(portalUrl);
                    url = this.joinUrl(portalUrl, "self");
                    params = {f: "json", token: credential.token};
                    this.loadJsonP(url, params, lang.hitch(this, function (portalSelf) {
                            this.portalSelfCache[portalUrl] = portalSelf;
                            def.resolve({portal: portalSelf});
                        }),
                        lang.hitch(this, function (errorResponse) {
                            def.resolve({error: true, message: errorResponse ? errorResponse.message : "Error retrieving portal info"});
                        })
                    );
                }
                return def;
            },
            /**
             * handler for self call to users organization
             * @param user
             * @private
             */
            _handleUserSelfResponse: function (user) {
                this.userInformation = user;
            },
            /**
             * handler for portal info call for users organization
             * @param portal
             * @private
             */
            _handleUserPortalsResponse: function (portal) {
                this.userPortal = portal;
            },
            /**
             * loads the portal info for the passed user
             * @param user user with accountId to load portal info for
             * @returns {Deferred}
             * @private
             */
            _handleLoadUsersPortal: function (user) {
                var def, credential, url, params;
                def = new Deferred();
                if (!user || !user.accountId) {
                    def.resolve({error: true, message: "Could not load user information for portal account"});
                }
                else {
                    credential = IdentityManager.findCredential(this.portalUrl);
                    url = this.joinUrl(this.portalUrl, "sharing/portals/" + user.accountId);
                    params = {f: "json", token: credential.token};
                    this.loadJsonP(url, params, lang.hitch(this, function (portal) {
                            this._handleUserPortalsResponse(portal);
                            def.resolve(portal);
                        }),
                        lang.hitch(this, function (errorResponse) {
                            def.resolve({error: true, message: errorResponse ? errorResponse.message : "Error retrieving portal account"});
                        }));
                }
                return def;
            }

        });
    });