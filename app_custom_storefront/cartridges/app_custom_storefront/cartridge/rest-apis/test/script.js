var RESTResponseMgr = require("dw/system/RESTResponseMgr");

exports.getInfo = function () {
    var info = {
      description: "This is test api"
    };

    RESTResponseMgr
      .createSuccess(info)
      .render();
};

exports.getInfo.public = true;