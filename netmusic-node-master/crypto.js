// 参考 https://github.com/darknessomi/musicbox/wiki/
'use strict'
// 引入Node.js原生加密模块
const crypto = require('crypto');
// 引入大整数运算库，用于RSA加密
const bigInt = require('big-integer');
// 网易云官方RSA加密用的modulus（大素数）
const modulus = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
// 网易云官方AES加密用的固定密钥
const nonce = '0CoJUm6Qyw8W8jud'
// 网易云官方RSA加密用的公钥
const pubKey = '010001'

// 字符串原型扩展：转16进制编码
String.prototype.hexEncode = function(){
    var hex, i;
    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += (""+hex).slice(-4);
    }
    return result
}

/**
 * 生成指定长度的随机密钥（用于AES二次加密）
 * @param size 密钥长度
 * @returns {string} 随机密钥
 */
function createSecretKey(size) {
  var keys = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var key = "";
  for (var i = 0; i < size; i++) {
      var pos = Math.random() * keys.length;
      pos = Math.floor(pos);
      key = key + keys.charAt(pos)
  }
  return key;
}

/**
 * AES-128-CBC加密
 * @param text 明文
 * @param secKey 密钥
 * @returns {string} base64密文
 */
function aesEncrypt(text, secKey) {
  var _text = text;
  // 固定IV向量
  var lv = new Buffer('0102030405060708', "binary");
  var _secKey = new Buffer(secKey, "binary");
  var cipher = crypto.createCipheriv('AES-128-CBC', _secKey, lv);
  var encrypted = cipher.update(_text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

/**
 * 字符串左补零到指定长度
 */
function zfill(str, size) {
    while (str.length < size) str = "0" + str;
    return str;
}

/**
 * RSA加密（公钥加密，结果为256位16进制字符串）
 * @param text 明文
 * @param pubKey 公钥
 * @param modulus 模数
 * @returns {string} 密文
 */
function rsaEncrypt(text, pubKey, modulus) {
  // 先反转字符串
  var _text = text.split('').reverse().join('');
  // 转16进制大整数
  var biText = bigInt(new Buffer(_text).toString('hex'), 16),
      biEx = bigInt(pubKey, 16),
      biMod = bigInt(modulus, 16),
      // 执行RSA加密：密文 = 明文^公钥 mod 模数
      biRet = biText.modPow(biEx, biMod);
  // 补零到256位
  return zfill(biRet.toString(16), 256);
}

/**
 * 网易云加密主流程
 * @param obj 需要加密的参数对象
 * @returns {Object} {params, encSecKey}
 */
function Encrypt(obj) {
  // 1. 参数转JSON字符串
  var text = JSON.stringify(obj);
  // 2. 生成16位随机密钥secKey
  var secKey = createSecretKey(16)
  // 3. 先用nonce做AES加密，再用secKey做AES加密（双层加密）
  var encText = aesEncrypt(aesEncrypt(text, nonce), secKey);
  // 4. 用RSA公钥加密secKey，得到encSecKey
  var encSecKey = rsaEncrypt(secKey, pubKey, modulus);
  // 5. 返回加密结果
  return {
    params: encText,
    encSecKey: encSecKey
  }
}

// 导出加密主函数
module.exports = Encrypt;
