const ldapClient = require('./ldap');
module.exports = function (RED) {
    'use strict';
    const mustache = require("mustache");

    function ldapNode (n) {
        RED.nodes.createNode(this, n);
        let node = this;
        let that = this;

        this.options = {
            host: n.host || 'ldap://localhost',
            port: n.port || 389,
            validatecert: n.validatecert
        };

        node.status({ });

        this.connect = function(config, node) {

            node.status({ fill: 'blue' ,shape: 'dot', text: 'connecting...' });

            that.ldapClient = new ldapClient();
            that.ldapClient.random = Math.random();

            let url = `${config.options.host}:${config.options.port}`;

            let options = {};
            if (config.options.validatecert === false) {
                options = {
                    tlsOptions: { rejectUnauthorized: false }
                };
            }

            that.ldapClient.connect(url, config.credentials.username, config.credentials.password, options).then( (res, err) => {
                if (err) {
                    node.status({ fill: 'red', shape: 'dot', text: 'Error'});
                    node.error(err ? err.toString() : 'Unknown error' );
                }
                node.status({ fill: 'green', shape: 'dot', text: 'connected' });
            }).catch( err => {
                node.status({ fill: 'red', shape: 'dot', text: 'Error'});
                node.error(err ? err.toString() : 'Unknown error' );
            });
        };

        this.disconnect = function() {
            try {
                that.ldapClient?.disconnect();
            } catch (err) {
                node.error(err ? err.toString() : 'Unknown error' );
            }
        }

        this.on('close', function (done) {
            that?.disconnect();
            node.status({ });
            done();
        });
    }

    function ldapUpdateNode (n) {
        RED.nodes.createNode(this, n);
        this.operation = n.operation;
        this.dn = n.dn;
        this.attribute = n.attribute;
        this.value = n.value;
        this.ldapConfig = RED.nodes.getNode(n.ldap);
        let node = this;

        node.on('input', async function (msg) {
            try {
                this.ldapConfig.connect(this.ldapConfig, node);
                node.operation = msg.operation || node.operation;
                node.dn = msg.dn || node.dn;
                node.attribute = msg.attribute || node.attribute;
                node.value = msg.payload || node.value;

                try {
                    node.status({ fill: 'blue', shape: 'dot', text: 'running update' });

                    let update = await this.ldapConfig.ldapClient.update(node.dn, node.operation, node.attribute, node.value);
                    msg.ldapStatus = update;

                    node.send(msg);

                    node.status({ fill: 'green', shape: 'dot', text: 'completed' });
                } catch (err) {
                    msg.error = err;
                    node.send(msg);
                    node.status({ fill: 'red', shape: 'ring', text: 'failed' });
                    node.error(err ? err.toString() : 'Unknown error' );
                }
            } finally {
                this.ldapConfig?.disconnect();
            }
        });
    }

    function ldapAddNode (n) {
        RED.nodes.createNode(this, n);
        this.entry = n.entry;
        this.ldapConfig = RED.nodes.getNode(n.ldap);
        let node = this;

        this.ldapConfig.connect(this.ldapConfig, node);

        node.on('input', async function (msg) {
            try {
                this.ldapConfig.connect(this.ldapConfig, node);
                node.dn = msg.dn || node.dn;
                node.entry = msg.payload || node.entry;

                try {
                    node.status({ fill: 'blue', shape: 'dot', text: 'running add' });

                    let add = await this.ldapConfig.ldapClient.add(node.dn, node.entry);
                    msg.ldapStatus = add;

                    node.send(msg);

                    node.status({ fill: 'green', shape: 'dot', text: 'completed' });
                } catch (err) {
                    msg.error = err;
                    node.send(msg);
                    node.status({ fill: 'red', shape: 'ring', text: 'failed' });
                    node.error(err ? err.toString() : 'Unknown error' );
                }
            } finally {
                this.ldapConfig?.disconnect();
            }
        });
    }

    function ldapDelNode (n) {
        RED.nodes.createNode(this, n);
        this.ldapConfig = RED.nodes.getNode(n.ldap);
        let node = this;

        node.on('input', async function (msg) {
            try {
                this.ldapConfig.connect(this.ldapConfig, node);
                node.dn = msg.dn || node.dn;

                try {
                    node.status({ fill: 'blue', shape: 'dot', text: 'running delete' });

                    let del = await this.ldapConfig.ldapClient.del(node.dn);
                    msg.ldapStatus = del;

                    node.send(msg);

                    node.status({ fill: 'green', shape: 'dot', text: 'completed' });
                } catch (err) {
                    msg.error = err;
                    node.send(msg);
                    node.status({ fill: 'red', shape: 'ring', text: 'failed' });
                    node.error(err ? err.toString() : 'Unknown error' );
                }
            } finally {
                this.ldapConfig?.disconnect();
            }
        });
    }

    function ldapSearchNode (n) {
        RED.nodes.createNode(this, n);
        this.baseDn = n.baseDn;
        this.searchScope = n.searchScope;
        this.filter = n.filter;
        this.attributes = n.attributes;
        this.ldapConfig = RED.nodes.getNode(n.ldap);
        let node = this;


        node.on('input', async function (msg) {
            try {
                this.ldapConfig.connect(this.ldapConfig, node);
                node.baseDn = msg.baseDn || mustache.render(node.baseDn,msg);
                node.searchScope = msg.searchScope || mustache.render(node.searchScope,msg);
                node.filter = msg.filter || mustache.render(node.filter,msg);
                node.attributes = msg.attributes || mustache.render(node.attributes,msg);

                try {
                    node.status({ fill: 'blue', shape: 'dot', text: 'running query' });

                    let search = await this.ldapConfig.ldapClient.search(node.baseDn, { filter: node.filter, attributes: node.attributes, scope: node.searchScope });
                    msg.payload = search;

                    node.send(msg);

                    node.status({ fill: 'green', shape: 'dot', text: 'completed' });
                } catch (err) {
                    msg.error = err;
                    node.send(msg);
                    node.status({ fill: 'red', shape: 'ring', text: 'failed' });
                    node.error(err ? err.toString() : 'Unknown error' );
                }
            } finally {
                this.ldapConfig?.disconnect();
            }
        });
    }

    function ldapCompareNode (n) {
        RED.nodes.createNode(this, n);
        this.dn = n.dn;
        this.attribute = n.attribute;
        this.value = n.value;
        this.ldapConfig = RED.nodes.getNode(n.ldap);
        let node = this;

        node.on('input', async function (msg) {
            try {
                this.ldapConfig.connect(this.ldapConfig, node);
                node.dn = msg.dn || node.dn;
                node.attribute = msg.attribute || node.attribute;
                node.value = msg.value || node.value;

                try {
                    node.status({ 
                        fill: 'blue', 
                        shape: 'dot', 
                        text: 'running compare' 
                    });

                    let compare = await this.ldapConfig.ldapClient.compare(
                        node.dn, 
                        node.attribute, 
                        node.value
                    );
                    msg.ldapStatus = compare;
                    msg.payload = compare.match;

                    node.send(msg);

                    node.status({ 
                        fill: 'green', 
                        shape: 'dot', 
                        text: 'completed' 
                    });
                } catch (err) {
                    msg.error = err;
                    node.send(msg);
                    node.status({ fill: 'red', shape: 'ring', text: 'failed' });
                    node.error(err ? err.toString() : 'Unknown error' );
                }
            } finally {
                this.ldapConfig?.disconnect();
            }
        });
    }

    function ldapExtendedNode (n) {
        RED.nodes.createNode(this, n);
        this.oid = n.oid;
        this.value = n.value;
        this.ldapConfig = RED.nodes.getNode(n.ldap);
        let node = this;

        node.on('input', async function (msg) {
            try {
                this.ldapConfig.connect(this.ldapConfig, node);
                node.oid = msg.oid || node.oid;
                node.value = msg.value || msg.payload || node.value;

                try {
                    node.status({ 
                        fill: 'blue', 
                        shape: 'dot', 
                        text: 'running extended' 
                    });

                    let extended = await this.ldapConfig.ldapClient.exop(
                        node.oid, 
                        node.value
                    );
                    msg.ldapStatus = extended;
                    msg.payload = extended;

                    node.send(msg);

                    node.status({ 
                        fill: 'green', 
                        shape: 'dot', 
                        text: 'completed' 
                    });
                } catch (err) {
                    msg.error = err;
                    node.send(msg);
                    node.status({ fill: 'red', shape: 'ring', text: 'failed' });
                    node.error(err ? err.toString() : 'Unknown error' );
                }
            } finally {
                this.ldapConfig?.disconnect();
            }
        });
    }

    function ldapModifyDnNode (n) {
        RED.nodes.createNode(this, n);
        this.dn = n.dn;
        this.newDn = n.newDn;
        this.deleteOldRdn = n.deleteOldRdn;
        this.ldapConfig = RED.nodes.getNode(n.ldap);
        let node = this;

        node.on('input', async function (msg) {
            try {
                this.ldapConfig.connect(this.ldapConfig, node);
                node.dn = msg.dn || node.dn;
                node.newDn = msg.newDn || node.newDn;
                node.deleteOldRdn = msg.hasOwnProperty('deleteOldRdn') 
                    ? msg.deleteOldRdn 
                    : node.deleteOldRdn;

                try {
                    node.status({ 
                        fill: 'blue', 
                        shape: 'dot', 
                        text: 'running modifyDn' 
                    });

                    let modifyDn = await this.ldapConfig.ldapClient.modifyDn(
                        node.dn, 
                        node.newDn, 
                        node.deleteOldRdn
                    );
                    msg.ldapStatus = modifyDn;

                    node.send(msg);

                    node.status({ 
                        fill: 'green', 
                        shape: 'dot', 
                        text: 'completed' 
                    });
                } catch (err) {
                    msg.error = err;
                    node.send(msg);
                    node.status({ fill: 'red', shape: 'ring', text: 'failed' });
                    node.error(err ? err.toString() : 'Unknown error' );
                }
            } finally {
                this.ldapConfig?.disconnect();
            }
        });
    }

    RED.nodes.registerType('ldap', ldapNode, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' }
        }
    });
    RED.nodes.registerType('ldap-update in', ldapUpdateNode);
    RED.nodes.registerType('ldap-search in', ldapSearchNode);
    RED.nodes.registerType('ldap-add in', ldapAddNode);
    RED.nodes.registerType('ldap-del in', ldapDelNode);
    RED.nodes.registerType('ldap-modifydn in', ldapModifyDnNode);
    RED.nodes.registerType('ldap-compare in', ldapCompareNode);
    RED.nodes.registerType('ldap-extended in', ldapExtendedNode);
};
