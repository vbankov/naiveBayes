module.exports = function () {
  // var http = require('http'),       // http library
      // mongojs = require('mongojs'), // mongo database
      fs = require('fs'),           // library to read files
      _ = require('underscore');

  
  /**
   * @desc Given an input string, tokenize it into an array of word tokens and strip unwanted strings like `Subject`.
   * @param  {String} text
   * @return {Array}  sanitized
   */
  NaiveBayes.prototype.defaultTokenizer = function (text) {
    /*remove punctuation from text - remove anything that isn't a word char or a space*/ 
    var rgxPunctuation = /[^\w\s]/g; 
    var sanitized = text.replace(rgxPunctuation, ' '); 
    sanitized = sanitized.split(/\s+/);
    sanitized = sanitized.filter(function(n){ return n != 'Subject'&&n != ' '&&n != '' });
    return sanitized; 
  }
  /* 
   *  @desc Check if file is considered legit or spam and return true if legit, false if spam
   *  @param {String} filename
   *  @return {Boolean} fileIsLegit
   */
  NaiveBayes.prototype.isLegit = function(filename){
    var legitRegEx = /.*legit.*/;
    return (filename.match(legitRegEx)!=null);
  }
  /* 
   *  @desc Read file and save data to global matrix.
   *  @param {String} filename
   *  @param {Boolean} file legitStatus
   */
  NaiveBayes.prototype.learnWord = function (word,legitStatus){
    if(typeof legitStatus !== 'boolean')
      throw new Error('NaiveBayes.learnWord: Not a valid status `'+legitStatus+'` for word: `'+word+'`.');
    if(word == '' || word == 'Subject' || word == ' ' )
      throw new Error('NaiveBayes.learnWord: Not a valid word to learn `'+word+'`.');   
    if(_.indexOf(this.vocabulary,word)==-1) this.initializeWord(word); // if word not in vocabulary add it
    if(legitStatus==true){
      this.theMatrix.words[word].legit++;
    }else{
      this.theMatrix.words[word].spam++;
    }
    this.theMatrix.words[word].total++;
  }
  /* 
   *  @desc Add a word to the dictionary with default count of 0.
   *  @param {String} word
   */
  NaiveBayes.prototype.initializeWord = function(word){
    var w = {spam: 0, legit: 0, total:0};
    this.theMatrix.words[word] = w; 
    this.vocabulary.push(word);
  }
  /* 
   *  @desc Count the total of words in the dictionary and save it to the global matrix. 
   *        Breakdown is legit/spam/total 
   */
  NaiveBayes.prototype.countWords = function(){

    this.theMatrix.messages.total = this.messagesCount;
    this.theMatrix.messages.legit = this.legitCount;
    this.theMatrix.messages.spam = this.spamCount;

    var spamOnly = _.groupBy(this.theMatrix.words,function(word){return word.spam>0 && word.legit==0;});
    var legitOnly = _.groupBy(this.theMatrix.words,function(word){return word.legit>0 && word.spam==0;});
    var spamLegit = _.groupBy(this.theMatrix.words,function(word){return word.legit>0 && word.spam>0;});

    spamOnly = spamOnly.true.length;
    legitOnly = legitOnly.true.length;
    spamLegit = spamLegit.true.length;

    console.log('\n === wordCount === \n');
    console.log('spamOnly '+spamOnly);
    console.log('legitOnly '+legitOnly);
    console.log('spamLegit '+spamLegit);

    this.theMatrix.wordCount.spam = spamOnly + spamLegit;
    this.theMatrix.wordCount.legit = legitOnly + spamLegit;
    this.theMatrix.wordCount.total = this.theMatrix.wordCount.spam+this.theMatrix.wordCount.legit;

   
  }
  NaiveBayes.prototype.learnFile = function (filename){
    var text = fs.readFileSync(this.dir+filename,{encoding:'utf8'});
    var arrayOfTexts = this.defaultTokenizer(text);
    for(i in arrayOfTexts){
        var spamCheck = this.isLegit(filename);
        this.learnWord(arrayOfTexts[i],spamCheck);
    }
  }
  /*
   *  @desc   Precalculates the 
   *          
   *          a-priori distribution
   *          
   *            P(Spam) = CountWords(Spam) / CountWords(Total)
   *            P(Legit) = CountWords(Legit) / CountWords(Total)
   *          
   *          evidence distribution P(Evidence) = { P(word), ... }, where
   *            
   *            P(word) = CountWords(word) / CountWords(Total) 
   *          
   *          likelihood {P(Word1/Spam), P(Word1/Legit) ... }
   *          
   *            P(word/CATEGORY) = CountWords(word is CATEGORY) / CountWords(word in all CATEGORIES)
   *            
   */
  NaiveBayes.prototype.preCalculateProbs = function(){
    var words = this.theMatrix.words,
        countAllWords = this.theMatrix.wordCount.total;
    /*   a-priori distribution {P(Spam), P(Legit)}  */
    var pSpam = this.theMatrix.wordCount.spam / countAllWords,
        pLegit = this.theMatrix.wordCount.legit / countAllWords;
    this.theMatrix.probability = { spam: pSpam, legit: pLegit };
    var pEvidence = {}, pLikelihood={};
    for(var n in words){
      
      /*   evidence distribution {P(word[1]),P(word[2]),..., P(word[n])}  */
      var p = words[n].total / countAllWords;
      pEvidence[n] = this.theMatrix.words[n].probability = p;

      /*          likelihood {P(word/Spam), P(word/Legit) ... }  */
      var qSpam = words[n].spam / words[n].total,
          qLegit = words[n].legit / words[n].total;
      this.theMatrix.words[n].likelihood = {spam: qSpam, legit: qLegit}; 
    }
  }
  NaiveBayes.prototype.printTables = function(){
    console.log('\n==== human readable matrix ====\n');
    console.log('\tWord\tSpam\tLegit\tTotal');
    for(i in nb.vocabulary){
      var k = nb.vocabulary[i];
      console.log('\t'+k+'\t'+nb.theMatrix.words[k].spam+'\t'+nb.theMatrix.words[k].legit+'\t'+nb.theMatrix.words[k].total);
    }
    console.log('\tTOTAL\t'+nb.theMatrix.wordCount.spam+'\t'+nb.theMatrix.wordCount.legit+'\t'+nb.theMatrix.wordCount.total);


    console.log('\n===== theMatrix =====');
    console.log(nb.theMatrix);
    console.log('\n==== vocabulary ====\n');
    console.log(nb.vocabulary);
  }
  NaiveBayes.prototype.testStats = function(){

  }
  NaiveBayes.prototype.classify = function(message){

    this.preCalculateProbs();
    var words = this.theMatrix.words;
    /*
     *                                                  P(word1/Spam) * P(word2/Spam) * ... 
     *  P(Spam/Message) = P(Spam/word1, word2, ...) =  ------------------------------------- * P(Spam)
     *                                                   P(word1) * P(word2) * ...
     *                    
     *                  = (word1.likelihood.spam * word2.likelihood.spam * ...) * theMatrix.probability.spam
     */
    var spamProbability = this.theMatrix.probability.spam;
    var legitProbability = this.theMatrix.probability.legit;
    for(var i in message){
      var msgWord = message[i];
      if(typeof words[msgWord] !== 'undefined'){    // IF we know that word
        spamProbability *=  words[msgWord].likelihood.spam;
        legitProbability *=  words[msgWord].likelihood.legit;
      }
    }
    // console.log('=== probability of message being spam ===');
    // console.log(spamProbability);
    // console.log('=== probability of message being legit ===');
    // console.log(legitProbability);
    if(spamProbability>legitProbability){
      return {class:'spam', probability: spamProbability,  probabilityNormalized: spamProbability/(spamProbability+legitProbability) , probabilitySpam: spamProbability, probabilityLegit: legitProbability};
    }else if(legitProbability>spamProbability){
      return {class:'legit', probability: legitProbability, probabilityNormalized: legitProbability/(spamProbability+legitProbability) , probabilitySpam: spamProbability, probabilityLegit: legitProbability};
    }else{
      // guess legit
      return {class:'legit', probability: legitProbability, probabilitySpam: spamProbability, probabilityLegit: legitProbability};
    }
  }

  function NaiveBayes(){
    console.log('\n ==== NaiveBayes classifier initialized ==== \n');
    // initialize an array to hold all words and an object to hold the matrix of data
    this.vocabulary = [];
    this.theMatrix = {
      words: {},
      wordCount: {
        total : 0,
        legit : 0,
        spam : 0
      },
      messages: {
        total : 0,
        legit : 0,
        spam : 0
      }
    };
    this.baseDir = './data/pu1/';
    this.messagesCount = 0;
    this.spamCount = 0;
    this.legitCount = 0;

    /*
     *  THIS IS THE MAIN ROUTINE OF READING THE FILES
     */

    for(var dataPart=1;dataPart<=9;dataPart++){
      this.dir = this.baseDir+'part'+dataPart+'/';
      var files = fs.readdirSync(this.dir);
          this.messagesCount+=files.length;

      for(var i in files){
        this.learnFile(files[i]);
        if(this.isLegit(files[i])) this.legitCount++;
      }
      this.spamCount = this.messagesCount - this.legitCount;
    }  

    this.countWords();

    
  }
  var tic = new Date().getTime(); // Start timer
  var nb = new NaiveBayes();

  // nb.printTables();
  /*
   *  THIS IS THE MAIN ROUTINE OF CLASSIFICATION OF TEST MESSAGES
   */
  console.log('\n ==== Classification of Test messages initialized ==== \n');

  var toc = (new Date().getTime() - tic)/1000; // End timer
  console.log('Time so far ' + Math.round(toc*100)/100 + 'secs');

  nb.testDir = nb.baseDir+'part10/';
  test = {};
  var testFiles = fs.readdirSync(nb.testDir);
      nb.testCount+=testFiles.length;
  for(var i in testFiles){
    var testMessage = nb.defaultTokenizer(fs.readFileSync(nb.testDir+testFiles[i],{encoding:'utf8'}));
    var classification = nb.classify(testMessage);
    var shouldBeClass = nb.isLegit(testFiles[i]) ? 'legit':'spam';
    console.log('\n==== classify message `'+testFiles[i]+'` ==== \n');
    console.log(classification);
    test[testFiles[i]] = {testMessage:testFiles[i], class: classification.class, shouldBeClass: shouldBeClass, classificationData: classification};
  }
  console.log('\n==== All messages ====\n');
  console.log(test);

  var toc = (new Date().getTime() - tic)/1000; // End timer
  console.log('\n\nTime taken ' + Math.round(toc*100)/100 + 'secs');
  console.log()
};

module.exports(); // fire the module