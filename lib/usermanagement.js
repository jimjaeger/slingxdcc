/*
 * ----------------------------------------------------------------------------
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <varga.daniel@gmx.de> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return Daniel Varga
 * ----------------------------------------------------------------------------
 */
const usermangement = function usermangement() {
	
}

/* ************************************************************************
 SINGLETON CLASS DEFINITION
 ************************************************************************ */
usermangement.instance = null;

/**
 * Singleton getInstance definition
 * @return singleton class
 */
usermangement.getInstance = function () {
    if (this.instance === null) {
        this.instance = new usermangement();
    }
    return this.instance;
};
usermangement.prototype = Object.create(require("events").EventEmitter.prototype);
module.exports = usermangement.getInstance();