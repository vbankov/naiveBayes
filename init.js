/**
 * @desc Given an input string, tokenize it into an array of word tokens.
 * @param  {String} text
 * @return {Array}
 */
NaiveBayes.prototype.defaultTokenizer = function (text) {/*remove punctuation from text - remove anything that isn't a word char or a space*/ var rgxPunctuation = /[^\w\s]/g; var sanitized = text.replace(rgxPunctuation, ' '); return sanitized.split(/\s+/); }
/* 
 *  @desc Given a filename return true if it is of format **legit**
 *  @param {String} filename
 *  @return {Boolean}
 */
NaiveBayes.prototype.isLegit = function(filename){
  var legitRegEx = /.*legit.*/;
  return filename.match(legitRegEx);
}
/* 
 *  @desc Read file and save data to globals
 *  @param {String} filename
 */
NaiveBayes.prototype.learnWord = function (word,category){
  if(!_.contains(['spam','legit'],category))
    throw new Error('Naivebayes.learnWord: Not a valid category to learn: `'+category+'`.');
  // if(theMatrix.words)
   
}



