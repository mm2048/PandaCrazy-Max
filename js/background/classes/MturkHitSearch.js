/** This class takes care of the search trigger data. Also handles dealing with the database to get data.
 * @class MturkHitSearch
 * @extends MturkClass
 * @author JohnnyRS - johnnyrs@allbyjohn.com */
class MturkHitSearch extends MturkClass {
  /**
	 * @param  {number} timer - Time to use for the timer to get next hit search results.
   */
  constructor(timer) {
    super();
    this.timerUnique = null;        					// Unique number for this timer in queue.
		this.searchesString = '';									// Temporary id's of hits to find new hits in results. Limited to 100 hits remembered.
		this.livePandaUIStr = '';									// Live search triggers from pandaUI
		this.liveSearchUIStr = '';								// Live search triggers from searchUI
		this.liveTermStr = ''; this.liveTermReg = null; this.liveTermData = {}; this.liveTermArr = []; this.liveCounter = 0;
		this.triggersAdded = 0;										// The number of triggers added. Also used for a unique number for each trigger.
		this.pandaCollecting = [];								// Array of all panda gId's collecting now from pandaUI.
		this.searchGStats = null;									// global search stats.
		this.searchUrl = null;          					// Url class for search url.
		this.pageSize = 45;             					// Only 45 hits to show on page by default.
		this.onlyQualified = true;      					// Show only qualified hits in search results.
		this.onlyMasters = false;       					// Show only master hits in search results.
		this.minReward = 0.01;          					// The minimum reward will be $0.01 by default.
		this.resultsBack = true;									// Used to make sure the last results from mturk has been processed.
		this.loggedOff = false;         					// Are we logged off from mturk?
		this.queueDbIds = [];											// Array of dbid's in memory which is limited by size to save memory use.
		this.queueSize = 30;											// The number of trigger expanded info in memory.
		this.triggers = {};												// Object with info in memory for triggers. Stays in memory.
		this.data = {};														// Object with all the data for triggers. Stays in memory.
		this.options = {};												// Object with all the options for triggers. Memory limits enforced.
		this.rules = {};													// Object with all the rules for triggers. Memory limits enforced.
		this.fromPanda = new Set();								// A set with dbID's of triggers coming from pandaUI.
		this.fromSearch = new Set();
		this.pausedPandaUI = false;
		this.pausedSearchUI = false;
		this.tempBlockGid = new Set(); this.blockedReqId = new Set(); this.blockedGroupId = new Set();
		this.dbSearchName = "Pcm_Searching";			// Name of the database used for all storage.
		this.storeName = 'searchTriggers';				// The database storage name for the triggers.
		this.storeOptionsName = 'searchOptions';	// The database storage name for the options for triggers
		this.storeRulesName = 'searchRules';			// The database storage name for the rules for triggers.
		this.storeHistoryName = 'searchHistory';  // The database storage name for the history for triggers.
    this.sort = "updated_desc";     					// Sort by updated_desc by default.
    this.pandaDur = {min:0, max:60} 					// Limits for the panda duration in minutes.
		this.db = null;													  // Set up the search database class.
		this.loaded = false;											// Has data been loaded from database?
		if (timer) {
			searchTimer.setMyClass(this);							// Tell timer what class is using it so it can send information back.
			searchTimer.theTimer(timer);    					// Set timer for this timer.
		}
		this.useDefault = false;
		this.temps = 1;
		this.defaultDuration = 12000;
		this.allData = {'options':'searchOptions', 'rules':this.storeRulesName, 'history':this.storeHistoryName, 'data':this.storeName};
    this.sorting = ["updated_desc", "updated_asc", "reward_asc", "reward_desc", "hits_asc", "hits_desc"];
		this.dbIds = {'pDbId':{}, 'values':{}, 'unique':{}};
		this.ruleSet = {'blockGid': new Set(), 'blockRid': new Set(), 'onlyGid': new Set(), 'terms': false, 'exclude': new Set(), 'include': new Set(), 'payRange': false, 'minPay': 0.00, 'maxPay': 0.00};
		if (timer) this.prepareSearch();						// Prepare all the search data.0
	}
	isSearchUI() { return (extSearchUI !== null); }
	/** Find out if a trigger has been added with type, value and SUI values.
	 * @param  {string} type     - Trigger type @param  {string} value - Trigger value @param  {bool} [sUI=true] - From searchUI?
	 * @return {bool}				     - True if trigger has been added. */
	is(type, value, sUI=true) { return this.dbIds.values.hasOwnProperty(`${type}:${value}:${sUI}`); }
	/** Checks to see if a trigger with type and value has been added from any UI.
	 * @param  {string} type - Trigger type @param  {string} value - Trigger value @return {bool} - True if trigger has been added. */
	isAll(type, value) { return (this.is(type, value, true) || this.is(type, value, false)); }
	/** returns the dbid from a type and value given from any UI.
	 * @param  {string} type  - Trigger type @param  {string} value - Trigger value
	 * @return {number}	      - The dbID for this trigger to use for all other data. */
	theDbId(type, value) { return (this.dbIds.values[`${type}:${value}:true`] || this.dbIds.values[`${type}:${value}:false`]) }
	/** Passes the database id from the unique id for trigger given.
	 * @param  {number} unique - The unique id number for the trigger.
	 * @return {number}	       - The dbID for this trigger to use for all other data. */
	uniqueToDbId(unique) { return this.dbIds.unique[unique]; }
	pandaToDbId(pDbId) { return this.dbIds.pDbId[pDbId]; }
	/** Opens the search database and deletes data if needed.
	 * @param  {book} [del=false]        - Delete database first before opening.
	 * @return {Promise<response|Error>} - Resolves with the response and rejects with the error. */
	openDB(del=false) {
		return new Promise( (resolve, reject) => {
			this.db = new DatabaseClass(this.dbSearchName, 1);
    	this.db.openDB( del, (e) => {
				if (e.oldVersion === 0) { // Had no database so let's initialise it.
          let store1 = e.target.result.createObjectStore(this.storeName, {keyPath:'id', autoIncrement:'true'});
          store1.createIndex('type', 'type', {unique:false});
          store1.createIndex('value', 'value', {unique:false});
          store1.createIndex('unique', ['type', 'value'], {unique:false});
					e.target.result.createObjectStore(this.storeOptionsName, {keyPath:"dbId", autoIncrement:"false"});
					e.target.result.createObjectStore(this.storeRulesName, {keyPath:"dbId", autoIncrement:"false"});
					e.target.result.createObjectStore(this.storeHistoryName, {keyPath:"dbId", autoIncrement:"false"});
					this.useDefault = true;
        }
      } ).then( response => resolve(response), rejected => { console.error(rejected); reject(rejected); });
		});
	}
	wipeData() { let db = new DatabaseClass(this.dbSearchName, 1); db.deleteDB(); db = null; }
	/** Updates the database with new data.
	 * @async 										 - So the data gets added or updated to the database.
	 * @param  {string} storeName  - Storage name @param  {object} newData - New Data @param  {bool} [onlyNew=false] - Only new data saved? 
	 * @param  {string} [key=null] - Key name */
	async updateToDB(storeName, newData, onlyNew=false, key=null) {
		if (this.db) {
			await this.db.addToDB(storeName, newData, onlyNew, key)
			.then(_, rejected => { console.error(rejected, 'Failed adding new data to database for a panda so had to end script.', 'Error adding panda data. Error:'); });
		}
	}
	/** Close the database usually for importing or UI closing. */
	closeDB() { this.db.closeDB(); this.db = null; }
	/** Loads data from database into memory using restrictions and adds to UI.
	 * @async  - So the data can be loaded into memory. */
	async loadFromDB() {
		let success = [], err = null;
		await this.db.getFromDB(this.storeName).then( async result => {
			for (const trigger of result) {
				let dbId = trigger.id, status = (trigger.disabled) ? 'disabled' : 'searching';
				await this.db.getFromDB(this.allData['options'], dbId).then( async options => {
					await this.db.getFromDB(this.storeRulesName, dbId).then( async data => {
						await this.db.getFromDB(this.storeHistoryName, dbId).then( async history => {
							if (this.loaded && extSearchUI && trigger.searchUI) {
								extSearchUI.addToUI(trigger, status, trigger.name, this.triggers[dbId].count);
								if (!trigger.disabled) this.setDisabled(trigger.type, trigger.value, false, trigger.searchUI);
							} else if (!this.loaded) {
								let numHits = Object.keys(history.gids).length, stats = Object.assign({'numFound':numHits, 'added':new Date().getTime(), 'lastFound':null, 'numHits':numHits},trigger);
								this.data[dbId] = {...trigger, ...stats}; this.options[dbId] = options; this.rules[dbId] = data.rules[data.ruleSet];
								let valueString = `${trigger.type}:${trigger.value}:${trigger.searchUI}`;
								if (!history.gids.hasOwnProperty('date')) { history.gids = this.fillInGidHistory(history.gids); }
								if (!trigger.hasOwnProperty('numHits')) this.updateToDB(this.storeName, this.data[dbId]);
								this.fillInObjects(this.triggersAdded++, dbId, this.data[dbId], status, valueString, this.data[dbId].searchUI); stats = {};
							}
							success[0] = "Loaded all search triggers from database";
							history = null;
						});
						data = null;
					});
					options = null;
				});
			}
			result = [];
		}, rejected => err = rejected );
		this.loaded = true;
		if (this.useDefault) {
			await this.addTrigger('rid', {'name':'Ibotta, Inc. Requester Trigger', 'reqId':'AGVV5AWLJY7H2', 'groupId':'', 'title':'', 'reqName':'Ibotta, Inc.', 'pay':0.01, 'duration':'6 minutes', 'status':'disabled'}, {'duration': 12000, 'once':false, 'limitNumQueue':0, 'limitTotalQueue':0, 'limitFetches':0, 'autoGoHam':false, 'tempGoHam':4000, 'acceptLimit':0});
			await this.addTrigger('gid', {'name':'Ibotta, Inc. GroupID Trigger', 'reqId':'', 'groupId':'30B721SJLR5BYYBNQJ0CVKKCWQZ0OI', 'title':'', 'reqName':'Ibotta, Inc.', 'pay':0.01, 'duration':'6 minutes', 'status':'disabled'}, {'duration': 12000, 'once':false, 'limitNumQueue':0, 'limitTotalQueue':0, 'limitFetches':0, 'autoGoHam':false, 'tempGoHam':4000, 'acceptLimit':0});
		}
	}
	async getDBData(name, dbId) {
		let returnValue = null;
		await this.db.getFromDB(this.allData[name], dbId).then( result => { returnValue = result; }, () => { delete this[name][dbId]; returnValue = null; });
		return returnValue;
	}
	/** Gets data according to the storage name and loads it into memory.
	 * @param  {string} name - Database storage name to save in @param  {number} dbId - Database ID */
	async getFromDB(name, dbId) {
		let returnValue = null, gotData = await this.getDBData(name, dbId); if (!gotData) return null;
		if (name === 'options') returnValue = gotData; else if (name === 'rulesets') returnValue = gotData;
		else if (name === 'rules') { let ruleSet = gotData.ruleSet; returnValue = gotData.rules[ruleSet]; }
		else if (name === 'history') {
			if (!gotData.gids.hasOwnProperty('date')) gotData.gids = this.fillInGidHistory(gotData.gids); returnValue = Object.assign({'gids':{}, 'dbId':dbId}, gotData);
		}
		return returnValue;
	}
	/** Prepare the search URL with many options.
	 * @param  {bool} [json=true]					- JSON         @param  {number} [pageSize=35]					- Page size  @param  {bool} [onlyQual=true]			 - Only qualified
	 * @param  {bool} [onlyMasters=false]	- Only Masters @param  {string} [sort="updated_desc"] - Sort value @param  {string} [minReward="0.01"] - Minimum reward */
	async prepareSearch(json=true, pageSize=35, onlyQual=true, onlyMasters=false, sort="updated_desc", minReward="0.01") {
		sort = (this.sorting.includes(sort)) ? sort : this.sorting[0];// set up sorting with passed value or default
		const formatJson = (json) ? "&format=json" : ""; // add format json or not?
		this.searchUrl = new UrlClass(`https://worker.mturk.com/?page_size=${pageSize}&filters%5Bqualified%5D=${onlyQual}&filters%5Bmasters%5D=${onlyMasters}&sort=${this.sort}&filters%5Bmin_reward%5D=${minReward}${formatJson}`);
		this.searchGStats =  new SearchGStats();
	}
	timerChange(timer=null) { if (timer) return searchTimer.theTimer(timer); else return searchTimer.theTimer(); }
	/** Removes all data from class to clear out memory as much as possible on exit.
	 * @async - Just so things get cleared out before a restart. */
	async removeAll() {
		this.searchesString = ''; this.livePandaUIStr = ''; this.liveSearchUIStr = ''; this.liveCounter = 0; this.pandaCollecting = [];
		this.searchGStats = null; this.options = {}; this.data = {}; this.rules = {}; this.dbIds.pDbId = {};
		this.fromPanda.clear(); this.fromSearch.clear(); this.tempBlockGid.clear(); this.dbIds.values = {}; this.dbIds.unique = {}; this.loaded = false;
	}
	/** Add database ID to a queue of data allowed in memory. Deletes data which isn't used much.
	 * @param  {number} item - Database ID */
	addToQueueMem(item) {
		if (this.queueDbIds.unshift(item) > this.queueSize) {
			let deleteThis = this.queueDbIds.pop();
			delete this.options[deleteThis]; delete this.rules[deleteThis];
		}
	}
	/**
	 * @param  {number} dbId - Database ID    @param  {number} [pDbId=null]  - Panda database ID
	 * @return {array} - Returns data in format [info, data, options, rules] */
	async pingTriggers(dbId) {
		if (!this.rules[dbId]) this.rules[dbId]= await this.getFromDB('rules', dbId); if (!this.options[dbId]) this.options[dbId] = await this.getFromDB('options', dbId);
		this.queueDbIds = arrayRemove(this.queueDbIds, dbId); this.addToQueueMem(dbId);
	}
	rulesChanged(dbId, newRules) { this.updateToDB(this.storeRulesName, {rules:[newRules], 'dbId':dbId, 'ruleSet':0}, false); }
	async theData(dbId, name, changed=null) {
		let returnValue = null;
		if (changed && name !== 'rules') this.updateToDB(this.allData[name], changed, false); else if (changed) this.rulesChanged(dbId, changed);
		if (!this[name][dbId]) await this.pingTriggers(dbId); else if (changed) this[name][dbId] = changed; returnValue = this[name][dbId];
		return returnValue;
	}
	async exportTriggers() {
		let exportThis = {}, setArray = Array.from(this.fromSearch);
		for (const dbId of setArray) { 
			let fullRules = await this.getFromDB('rulesets', dbId), theHistory = await this.getFromDB('history', dbId), options = await this.getFromDB('options', dbId);
			let theData = Object.assign({}, this.data[dbId]), theOptions = Object.assign({}, options);
			for (const ruleSet of fullRules.rules) {
				ruleSet.blockGid = Array.from(ruleSet.blockGid); ruleSet.blockRid = Array.from(ruleSet.blockRid); ruleSet.exclude = Array.from(ruleSet.exclude);
				ruleSet.include = Array.from(ruleSet.include); ruleSet.onlyGid = Array.from(ruleSet.onlyGid);
			}
			theHistory = Object.assign({}, theHistory);
			exportThis[dbId] = {trigger:theData, options:theOptions, rules:fullRules, history:theHistory};
		}
		return exportThis;
	}
	/** Find out if panda UI has been opened.
	 * @return {bool} - True if the panda UI has been opened. */
	isPandaUI() { return (extPandaUI!==null); }
	/** Unpause the search timer. */
	unPauseTimer() { searchTimer.paused = false; }
	/** This method gets called when the queue gets a new result from mturk so it has to be logged on. */
	gotNewQueue() { this.nowLoggedOn(); }
	/** We are logged off so pause the timer and tell the search UI that it's logged off. */
	nowLoggedOff() { searchTimer.paused = true; this.loggedOff = true; if (extSearchUI) extSearchUI.nowLoggedOff(); }
	/** We are logged on so unpause timer and tell the search UI that it's logged back in. */
	nowLoggedOn() { this.unPauseTimer(); this.loggedOff = false; if (extSearchUI) extSearchUI.nowLoggedOn(); }
	importing() { if (extSearchUI) { extSearchUI.importing(); } }
	importingDone() { if (extSearchUI) extSearchUI.importingDone(); }
	/** This method will start the searching of the mturk queue.
	 * @param  {number} dbId - The database ID of the trigger that is starting. */
	startSearching(dbId) {
		this.liveCounter = this.livePandaUIStr.length + ((this.searchGStats && this.searchGStats.isSearchOn()) ? this.liveSearchUIStr.length : 0);
		if (!this.timerUnique && this.liveCounter) { // Make sure it's not already searching.
			this.timerUnique = searchTimer.addToQueue(-1, (timerUnique, elapsed, theId) => {
				if (this.liveCounter) this.goFetch(this.searchUrl, timerUnique, elapsed, theId, dbId);
				else {
					if (this.searchGStats && this.searchGStats.isSearchOn()) extSearchUI.stopSearching(); else this.stopSearching();
				}
			});
		}
	}
	/** Mark a trigger as searching now.
	 * @param  {number} pDbId - The panda ID @param  {bool} [sUI=true] - do search from search UI or panda UI? */
	doSearching(pDbId, sUI=true) {
		let dbId = this.dbIds.pDbId[pDbId];
		if (this.data[dbId].type === 'rid') {
			this.triggers[dbId].status = 'finding';
			this.triggers[dbId].timerUnique = searchTimer.addToQueue(this.data[dbId].value, (timerUnique, elapsed, rId) => {
				this.goFetch(this.triggers[dbId].reqUrl, timerUnique, elapsed, rId, dbId, this.data[dbId].type, this.data[dbId].value, sUI);
			});
		} else {
			if (!this.triggers[dbId].tempDisabled) this.setDisabled(this.data[dbId].type, this.data[dbId].value, false, sUI);
			else this.triggers[dbId].tempDisabled = false;
		}
	}
	/** Mark a trigger as disabled now.
	 * @param  {string} type - Trigger type @param  {string} value - Trigger value @param  {bool} [sUI=true] - From searchUI? */
	doDisabled(type, value, sUI=true) {
		if (this.is(type, value, sUI)) {
			let dbId = this.dbIds.values[`${type}:${value}:${sUI}`];
			this.setDisabled(type, value, true, sUI); this.triggers[dbId].tempDisabled = false;
		}
	}
	/** This method will stop the searching of the mturk queue. */
	stopSearching() {
		this.liveCounter = this.livePandaUIStr.length + ((this.searchGStats && this.searchGStats.isSearchOn()) ? this.liveSearchUIStr.length : 0);
		if (this.timerUnique && this.liveCounter === 0) {
			if (searchTimer) searchTimer.deleteFromQueue(this.timerUnique);
			this.timerUnique = null;
		}
	}
	/** Gets the status from panda UI of this particular panda job.
	 * @param  {string} gId	 - The group ID @param  {bool} status - The status of the panda in panda UI. */
	async pandaStatus(gId, status) {
		let dbId = (this.isAll('gid', gId)) ? this.theDbId('gid', gId) : null;
		if (dbId) {
			if (status) {
				this.pandaCollecting.push(gId);
				if (dbId && this.triggers[dbId].status === 'disabled') this.triggers[dbId].status = 'collecting';
			} else {
				this.pandaCollecting = arrayRemove(this.pandaCollecting, gId);
				if (dbId) {
					this.triggers[dbId].status = (this.triggers[dbId].status === 'collecting') ? 'searching' : 'disabled';
					this.setTempBlockGid(gId, false);
				}
			}
		}
	}
	async maintainGidHistory(dbId, key, sent) {
		let thisHistory = await this.getFromDB('history', dbId); thisHistory.gids[key] = {'date':new Date().getTime(), 'sent':sent};
		this.data[dbId].numHits = Object.keys(thisHistory.gids).length;
		this.updateToDB(this.storeHistoryName, thisHistory, false);
	}
	/** Temporarily block trigger from detecting this group ID in the search results.
	 * @param  {object} trigger	- The trigger  @param  {string} gId - Blocked group ID */
	setTempBlockGid(gId, block=null) {
		let blocked = (this.tempBlockGid.has(gId));
		if (block === null) block = !blocked;
		if ((block && !blocked) || (!block && blocked)) { if (block) this.tempBlockGid.add(gId); else this.tempBlockGid.delete(gId); }
	}
	/** Find out if this group ID or requester ID is temporarily blocked.
	 * @param  {object} trigger	- The trigger @param  {string} gId - The group ID
	 * @return {bool}						- True if gId is blocked on this trigger. */
	isIdsBlocked(gId, rId) { if (this.blockedGroupId.has(gId) || this.tempBlockGid.has(gId) || this.blockedReqId.has(rId)) return true; else return false; }
	/** Does this hit have a pay rate in the triggers pay range rules?
	 * @param  {object} rules - The rules object from a trigger. @param  {number} pay   - The pay rate of the hit to check.
	 * @return {bool}					- True if pay rate is good or not. */
	isPayRange(rules, pay) {
		if (pay < rules.minPay) return false;
		if (rules.maxPay !== 0 && pay > rules.maxPay) return false;
		return true;
	}
	/** Does this hit have a term in the title or description that is in the triggers rules?
	 * @param  {object} rules - The rules @param  {string} title - Title of this hit. @param  {string} desc	- Description of this hit.
	 * @return {bool}					- True if term rules is in the hit. */
	isTermCheck(rules, searchStr, orLogic=true) {
		let good = (orLogic) ? false : true;
		if (rules.include.size === 0) good = true;
		else for (const term of rules.include) { if (searchStr.includes(term)) good = (orLogic) ? true : good & true; else if (!orLogic) good = false; }
		if (rules.exclude.size > 0 && good) for (const term of rules.exclude) { if (searchStr.includes(term)) good = false; }
		return good;
	}
	/** Send the panda information to panda UI for collecting with a duration and go ham duration in data.
	 * @param  {object} item - Hit item @param  {object} info - Trigger info @param  {object} options - Trigger options @param  {object} type - Trigger type */
	async sendToPanda(item, dbId, type='', useOnce=null, useDur=null, useFetches=null) {
		let info = this.triggers[dbId], options = await this.theData(dbId, 'options');
		let pandaId = myPanda.getMyId(info.pDbId), tempDur = (options.duration) ? options.duration : this.defaultDuration;
		if (tempDur < 1000 || tempDur > 120000) { tempDur = options.duration = this.defaultDuration; this.updateToDB(this.storeOptionsName, options, false); }
		let goOnce = (useOnce) ? useOnce : options.once, goDur = (useDur !== null) ? useDur : tempDur, goFetch = (useFetches !== null) ? useFetches : options.limitFetches;
		let dO = dataObject(item.hit_set_id, item.description, item.title, item.requester_id, item.requester_name, item.monetary_reward.amount_in_dollars, item.assignable_hits_count);
		let oO = optObject(goOnce,_,_, options.limitNumQueue, options.limitTotalQueue, goFetch, _, options.autoGoHam, options.goHamDuration);
		if (extPandaUI) extPandaUI.addFromSearch(dO, oO, true, true, true, goDur, (options.autoGoHam) ? options.tempGoHam: 0, type, pandaId, info.setName);
	}
	tempDisable(dbId, tempDisabled=false) {
		let thisTrigger = this.triggers[dbId]; thisTrigger.tempDisabled = tempDisabled;
		if (extPandaUI) extPandaUI.tempDisable(thisTrigger.count, tempDisabled);
	}
	/** Check all live triggers for this item.
	 * @param  {object} item - The hit item that needs to be checked for any trigger detection. */
	async checkTriggers(item) {
		let temps = this.temps++, termsFound = [];
		// console.time(`checkTriggers${temps}`);
		let liveStr = ((!this.pausedPandaUI) ? this.livePandaUIStr : '') + ((this.searchGStats.isSearchOn() && !this.pausedSearchUI) ? this.liveSearchUIStr : '');
		if (this.isIdsBlocked(item.hit_set_id, item.requester_id)) return;
		let gidFound = liveStr.includes(`[gid:${item.hit_set_id}]]`);
		let ridFound = liveStr.includes(`[rid:${item.requester_id}]]`);
		let titleDescription = item.title.toLowerCase() + ' , ' + item.description.toLowerCase();
		if (Object.keys(this.liveTermData).length) for (const key of Object.keys(this.liveTermData)) { if (titleDescription.includes(key.toLowerCase())) termsFound.push(key); }
		if (gidFound || ridFound || termsFound.length) {
			let key1 = (gidFound) ? 'gid' : (ridFound) ? 'rid' : 'terms', key2 = (gidFound) ? item.hit_set_id : item.requester_id;
			if (key1 !== 'terms') termsFound = [key1];
			for (const term of termsFound) {
				let dbIdArr = (key1 === 'terms') ? this.liveTermData[term] : [this.theDbId(key1, key2)];
				for (const dbId of dbIdArr) {
					let triggered = true, thisTrigger = this.triggers[dbId];
					let options = await this.theData(dbId, 'options'), rules = await this.theData(dbId, 'rules');
					if (rules.payRange) triggered = this.isPayRange(rules, item.monetary_reward.amount_in_dollars);
					if (rules.terms) triggered = triggered & this.isTermCheck(rules, titleDescription, (key1 !== 'terms'));
					if (triggered && !thisTrigger.tempDisabled && !this.pandaCollecting.includes(item.hit_set_id)) {
						console.log(`Found a trigger: ${this.data[dbId].name} - ${item.assignable_hits_count} - ${item.hit_set_id} - ${item.monetary_reward.amount_in_dollars}`);
						this.data[dbId].numFound++; this.data[dbId].lastFound = new Date().getTime(); this.maintainGidHistory(dbId, item.hit_set_id, true); 
						if ((key1 === 'rid' && !rules.blockGid.has(item.hit_set_id)) || key1 === 'gid') {
							if (extSearchUI) extSearchUI.triggeredHit(thisTrigger.count, this.data[dbId]);
							this.sendToPanda(item, dbId, key1);
							if (options.once && key1 === 'rid') this.setTempBlockGid(item.hit_set_id, true);
							if (key1 === 'gid') { thisTrigger.tempDisabled = true; thisTrigger.status = 'collecting'; }
							this.updateToDB(this.storeName, this.data[dbId]);
						} else if (key1 === 'terms') {
							if (extSearchUI) extSearchUI.triggeredHit(thisTrigger.count, this.data[dbId], item, term);
							this.setTempBlockGid(item.hit_set_id, true);
							this.updateToDB(this.storeName, this.data[dbId]);
						}
						break;
					}	
				}
			}
		}
		// console.timeEnd(`checkTriggers${temps}`);
		liveStr = ''; item = {}; termsFound = [];
	}
	pauseSearch(pandaUI=false, searchUI=false) { this.pausedPandaUI = pandaUI; }
	/**	Creates the live trigger string which holds all trigger info for faster searching.
	 * @param  {string} type	   - Type of trigger@param  {string} value - Group ID or requester ID @param  {bool} enable - Enabled or disabled?
	 * @param  {bool} [sUI=true] - Search UI or panda UI. */
	liveString(type, value, enable, sUI=true) {
		let liveStr = (sUI) ? 'liveSearchUIStr' : 'livePandaUIStr', triggerString = `[[${type}:${value}]]`;
		if (enable) this[liveStr] += triggerString;
		else this[liveStr] = this[liveStr].replace(triggerString, '');
		this.liveCounter = this.livePandaUIStr.length + ((this.searchGStats && this.searchGStats.isSearchOn()) ? this.liveSearchUIStr.length : 0);
	}
	/** Sets up the live terms data for faster searching of terms.
	 * @param  {bool} enable - Enabled? @param  {object} rules - Rules object @param  {number} dbId - Database ID */
	termData(enable, rules, dbId) {
		if (rules.terms && rules.include.size) {
			let thisTermStr = rules.include.values().next().value;
			if (enable && thisTermStr) { buildSortObject(this.liveTermData, thisTermStr, dbId); }
			else if (thisTermStr) flattenSortObject(this.liveTermData, thisTermStr, dbId);
		}
	}
	/** Sets the disabled status of trigger and redoes the live string if needed.
	 * @param  {string} type	   - Type of trigger@param  {string} value - Group ID or requester ID @param  {bool} enable - Enabled or disabled?
	 * @param  {bool} [sUI=true] - Search UI or panda UI. */
	async setDisabled(type, value, disabled, sUI=true) {
		let dbId = this.theDbId(type, value), rules = await this.theData(dbId, 'rules');
		if (type === 'custom') this.termData(!disabled, rules, dbId);
		else this.liveString(type, value, !disabled, sUI);
		if (this.searchGStats && this.searchGStats.isSearchOn() && this.liveCounter === 0) this.stopSearching();
		else if (this.liveCounter) this.startSearching();
	}
	/** Toggles the status of the trigger.
	 * @param  {string} type  - Type of trigger @param  {string} value - Group ID or requester ID
	 * @return {bool}         - Status of the trigger. */
	toggleTrigger(unique) {
		let dbId = this.dbIds.unique[unique];
		if (dbId) {
			let disabled = (this.triggers[dbId].status === 'disabled') ? true : false;
			this.setDisabled(this.data[dbId].type, this.data[dbId].value, !disabled);
			this.triggers[dbId].status = (disabled) ? 'searching' : 'disabled'; this.data[dbId].disabled = !disabled;
			this.updateToDB(this.storeName, this.data[dbId]);
			return this.triggers[dbId].status;
		} else return null;
	}
	/** Copy the changes to the options and rules for trigger with the database id.
	 * @param  {object} changes - Changes for trigger @param  {number} dbId - Database id for trigger. */
	async optionsChanged(changes, dbId) {
		changes.rules.payRange = (changes.rules.minPay > 0 || changes.rules.maxPay > 0);
		await this.theData(dbId, 'rules', changes.rules); await this.theData(dbId, 'options', changes.options);
		if (changes.hasOwnProperty('details') && changes.details) {
			this.data[dbId].name = changes.details.name; this.data[dbId].disabled = changes.details.disabled;
			this.updateToDB(this.storeName, this.data[dbId], false);
		}
	}
	/** Returns a copy of the options object using the database ID.
	 * @param  {number} dbId - Database ID number.
	 * @return {object}      - The object of the copied options data. */
	async optionsCopy(dbId) { let options = await this.theData(dbId, 'options'); return Object.assign({}, options); }
	/** Returns a deep copy of the rules for trigger.
	 * @param  {number} dbId - Database id for trigger.
	 * @return {object}			 - The deep copy of the rules for trigger. */
	async rulesCopy(dbId) {
		let rules = await this.theData(dbId, 'rules'), rulescopy = Object.assign({}, rules);
		rulescopy.blockGid = new Set(rules.blockGid); rulescopy.exclude = new Set(rules.exclude);
		rulescopy.include = new Set(rules.include); rulescopy.onlyGid = new Set(rules.onlyGid);
		return rulescopy;
	}
	/** Loads trigger information to database from import file or user trigger adds.
	 * @param  {object} triggers - Trigger Object @param  {object} options - Trigger options @param  {object} rules - Trigger rules @param  {bool} multiple - Save object is array.*/
	async saveToDatabase(data, options=null, rules=null, history=null, multiple=false) {
		let dbId = null;
		await this.updateToDB(this.storeName, data, false);
		if (multiple) {
			for (let i = 0, len = data.length; i < len; i++) { options[i].dbId = data[i].id; rules[i].dbId = data[i].id; history[i].dbId = data[i].id }
		} else { dbId = data.id; if (options !== null) options.dbId = dbId; if (rules !== null) rules.dbId = dbId; if (history !== null) history.dbId = dbId; }
		if (options !== null) await this.updateToDB(this.storeOptionsName, options, !multiple, dbId);
		if (rules !== null) await this.updateToDB(this.storeRulesName, rules, !multiple, dbId);
		if (history !== null) await this.updateToDB(this.storeHistoryName, history, !multiple, dbId);
	}
	/** Sets up object for the group ID history for a trigger and returns it.
	 * @param  {object} history - Trigger History
	 * @return {object}					- The object with the group ID history set. */
	fillInGidHistory(history) {
		let newObj = {};
		if (Object.keys(history).length) {
			newObj = Object.keys(history).reduce((result, key) => {
				let theDate = (history[key].hasOwnProperty('date')) ? history[key].date : history[key], sent = (history[key].hasOwnProperty('sent')) ? history[key].sent : true;
				result[key] = {'date':theDate, 'sent':sent};
				return result;
			}, {});
		}
		return newObj;
	}
	/** Fills objects in memory used when searching for hits. Used for adding from database or from user.
	 * @param  {number} count	- Unique ID      @param  {number} dbId				 - Database ID    @param  {object} data - Trigger data
	 * @param  {bool} status	- Trigger status @param  {string} valueString - Unique string 	@param  {bool} SUI 		- From searchUI? */
	async fillInObjects(count, dbId, data, status, valueString, sUI) {
		let reqUrl = (data.type === 'rid') ? new UrlClass(`https://worker.mturk.com/requesters/${data.value}/projects`) : null;
		let setName = (data.searchUI) ? 'fromSearch' : 'fromPanda'; this[setName].add(dbId);
		this.triggers[dbId] = {'count':count, 'pDbId':data.pDbId, 'setName':setName, 'status':status, 'tempDisabled':false, 'timerUnique':-1, 'reqUrl':reqUrl};
		if (data.pDbId !== -1) this.dbIds.pDbId[data.pDbId] = dbId; this.dbIds.values[valueString] = dbId; this.dbIds.unique[count] = dbId;
		this.addToQueueMem(dbId);
		if (extSearchUI && sUI) {
			extSearchUI.addToUI(data, status, data.name, count);
			if (!data.disabled) this.setDisabled(data.type, data.value, false, data.searchUI);
		}
	}
	async moveToSearch(pDbId, status) {
		let dbId = this.dbIds.pDbId[pDbId];
		let theData = this.data[dbId], valueString = `${theData.type}:${theData.value}:`;
		this.triggers[dbId].status = (status) ? 'searching' : 'disabled'; theData.status = status;
		if (theData.searchUI) return false; else theData.searchUI = true;
		if (this.dbIds.values[valueString + 'true']) return false;
		delete this.dbIds.values[valueString + 'false']; this.dbIds.values[valueString + 'true'] = dbId; delete this.dbIds.pDbId[pDbId];
		this.triggers[dbId].setName = 'fromSearch'; this.fromPanda.delete(dbId); this.fromSearch.add(dbId); this.triggers[dbId].pDbId = -1; theData.pDbId = -1;
		extSearchUI.addToUI(theData, this.triggers[dbId].status, theData.name, this.triggers[dbId].count);
		extSearchUI.redoFilters(theData.type); extSearchUI.appendFragments();
		await this.saveToDatabase(theData,_,_,_, false);
		return true;
	}
	/** Adds a new trigger with the type of it and the value for group ID or requester ID.
	 * @param  {string} type	     - Type         @param  {object} info	        - Info object     @param  {object} options	- Options object
	 * @param  {object} [rules={}] - Rules object @param  {object} [history={}] - History object  @param  {bool} [sUI=true] - From searchUI?
	 * @return {number}				- Returns the unique id of this trigger. */
	async addTrigger(type, info, options, rules={}, history={}, sUI=true) {
		let key2 = (type === 'rid') ? info.reqId : (info.idNum) ? info.idNum : info.groupId, valueString = `${type}:${key2}:${sUI}`;
		if (!key2 && type !== 'custom') return null; // No value set for search type.
		if (this.dbIds.values[valueString]) return null; // Cannot accept any duplicates.
		if (!info.pDbId) info.pDbId = -1;
		this.triggersAdded++;
		if (type === 'custom' && !info.idNum) { key2 = this.triggersAdded; valueString = `${type}:${key2}:${sUI}`; }
		let theObject = {'type':type, 'value':key2, 'pDbId':info.pDbId, 'searchUI':sUI, 'name':info.name, 'disabled':(info.status === 'disabled'), 'numFound':0, 'added':new Date().getTime(), 'lastFound':null, 'numHits':0};
		let theRule = Object.assign({}, this.ruleSet, rules), theRules = {'rules':[theRule], 'ruleSet':0};
		let theHistory = {'gids':this.fillInGidHistory(history)}; theObject.numHits = Object.keys(theHistory.gids).length;
		await this.saveToDatabase(theObject, options, theRules, theHistory, false);
		let dbId = theObject.id; this.data[dbId] = theObject;
		await this.theData(dbId, 'options'); await this.theData(dbId, 'rules');
		await this.fillInObjects(this.triggersAdded, dbId, theObject, info.status, valueString, sUI);
		if (myHistory) myHistory.fillInHistory(history, 'triggers');
		myPanda.searchUIConnect(true);
		return this.triggersAdded;
	}
	appendFragments() { if (extSearchUI) extSearchUI.appendFragments(); }
	/** Remove the trigger with the type and value from the class.
	 * @param  {number} [dbId=null]	- Database ID @param  {number} [pDbId=null] - Panda Database ID. @param  {bool} [sUI=true] - Search UI or panda UI. */
	async removeTrigger(dbId=null, pDbId=null, unique=null, sUI=true, removeDB=false) {
		dbId = (dbId) ? dbId : (unique) ? this.dbIds.unique[unique] : this.dbIds.pDbId[pDbId];
		if (dbId) {
			let tempData = Object.assign({}, this.data[dbId]);
			await this.setDisabled(tempData.type, tempData.value, true); // Remove trigger from live strings.
			if (sUI && extSearchUI) extSearchUI.removeTrigger(this.triggers[dbId].count);
			this.fromPanda.delete(dbId); this.fromSearch.delete(dbId);
			delete this.options[dbId]; delete this.rules[dbId]; delete this.triggers[dbId];
			delete this.dbIds.pDbId[pDbId]; delete this.dbIds.values[`${tempData.type}:${tempData.value}:${sUI}`];
			if (removeDB) {
				this.db.deleteFromDB(this.storeName, dbId); this.db.deleteFromDB(this.storeRulesName, dbId);
				this.db.deleteFromDB(this.storeOptionsName, dbId);
				this.db.deleteFromDB(this.storeHistoryName, dbId);
			}
			if (this.searchGStats && this.searchGStats.isSearchOn() && this.liveCounter === 0) this.stopSearching();
			myPanda.searchUIConnect(true);
		}
	}
	/** When a UI is closed then this method will remove any triggers added from that UI.
	 * @param  {bool} [sUI=true] - The UI that is being closed. */
	async originRemove(sUI=true) {
		let setName = (sUI) ? 'fromSearch' : 'fromPanda';
		for (const dbId of this[setName]) { await this.removeTrigger(dbId,_,_, sUI); }
		if (sUI) this.loaded = false;
	}
  /** Fetches the url for this search after timer class tells it to do so and handles mturk results.
	 * Can detect logged out, pre's and good search results.
   * @param  {object} objUrl	   - Url object        @param  {number} queueUnique - Queue Unique ID @param  {number} elapsed	 - Elapsed Time
	 * @param  {number} rId    		 - Requester ID      @param  {number} dbId 				- Database ID     @param  {string} [type=''] - Type for trigger
	 * @param  {string} [value=''] - Value for trigger @param  {bool} [sUI=true]		- From UI */
  async goFetch(objUrl, queueUnique, elapsed, rId, dbId, type='', value='', sUI=true) {
		if (this.searchGStats) this.searchGStats.setSearchElapsed(elapsed); // Pass elapsed time to global search stats
		if (this.searchGStats && (rId === -1 || this.resultsBack)) {
			if (rId !== -1) this.resultsBack = false;
			if (this.dLog(4)) console.debug(`%cgoing to fetch ${JSON.stringify(objUrl)}`,CONSOLE_DEBUG);
			let result = await super.goFetch(objUrl);
			if (!result) {
				if (this.dError(1)) { console.error('Returned fetch result was a null.', JSON.stringify(objUrl)); }
			} else if (this.searchGStats) {
				this.searchGStats.addTotalSearchFetched();
				if (!this.pausedPandaUI) myPanda.searchFetched();
				if (result.mode === "logged out" && queueUnique !== null) this.nowLoggedOff();
				else if (result.type === "ok.json") {
					if (result.mode === "pre") {
						this.searchGStats.addTotalSearchPRE(); // found a PRE while searching so increment search pre counter
					} else {
						this.searchGStats.addTotalSearchResults(result.data.total_num_results);
						let i = 0, thisItem = {}, hitPosId = null, tempString = '', tempNewHits = {}, rewardSort = {};
						do {
							thisItem = result.data.results[i++];
							// hitPosId represents a signature for this particular hit using creation time and hit set ID
							hitPosId = new Date(thisItem.creation_time).getTime() + "" +  thisItem.hit_set_id;
							tempString += `[[${hitPosId}]]`;
							if (!this.searchesString.includes(`[[${hitPosId}]]`)) {
								let dO = hitObject(thisItem.hit_set_id, thisItem.description, thisItem.title, thisItem.requester_id, thisItem.requester_name, thisItem.monetary_reward.amount_in_dollars, thisItem.assignable_hits_count, thisItem.assignment_duration_in_seconds, thisItem.latest_expiration_time);
								tempNewHits[dO.groupId] = dO; rewardSort[thisItem.monetary_reward.amount_in_dollars] = thisItem;
							}
						} while (i < result.data.results.length);
						let sortArray = Object.keys(rewardSort).sort((a,b) => b - a);
						for (const key of sortArray) { if (this.liveCounter) this.checkTriggers(rewardSort[key]); }
						myHistory.fillInHistory(tempNewHits, 'searchResults');
						this.searchesString = tempString + this.searchesString;
						this.searchesString = this.searchesString.substr(0,4700);
						thisItem = {}; tempString = ''; tempNewHits = {};
					}
				} else if (result.type === "ok.text") {
					let reactProps = $(result.data).find('.row.m-b-md div:eq(1)').data('react-props');
					if (reactProps) {
						let hitsData = reactProps.bodyData, rewardSort = {};
						if (hitsData.length > 0) {
							for (const hit of hitsData) { rewardSort[hit.monetary_reward.amount_in_dollars] = hit; }
							let sortArray = Object.keys(rewardSort).sort((a,b) => b - a);
							let requesterName = $(result.data).find('h1.m-b-md').text();
							if (requesterName !== '') myPanda.updateReqName(_, requesterName, this.triggers[dbId].pDbId);
							for (const key of sortArray) { this.checkTriggers(rewardSort[key], [{'type':'rid', 'value':rId}]) }
						}
						hitsData = null;
					}
					searchTimer.deleteFromQueue(queueUnique); this.triggers[dbId].status = 'searching';
					this.setDisabled(type, value, false, sUI);
					if (!this.timerUnique) this.startSearching(dbId);
				}
			}
			result = {};
			this.resultsBack = true;
		}
	}
	/** Checks if this error is allowed to show depending on user options and class name.
	 * (0)-fatal = Errors that can crash or stall program.
   * (1)-error = Errors that shouldn't be happening but may not be fatal.
   * (2)-warn = Warnings of errors that could be bad but mostly can be self corrected.
	 * @param  {number} levelNumber - Level number for this error.
	 * @return {bool}							  - True if this error is permitted to show. */
	dError(levelNumber) { return dError(levelNumber, 'MturkHitSearch'); }
	/** Checks if this debug message is allowed to show depending on user options and class name.
   * (1)-info = Shows basic information of progress of program.
   * (2)-debug = Shows the flow of the program with more debugging information.
   * (3)-trace = More details shown including variable contents and functions being called.
   * (4)-trace urls = Shows full details of variables, functions, fetching urls and flow of program.
	 * @param  {number} levelNumber - Level number for this debug message.
	 * @return {bool}							  - True if this message is permitted to show. */
	dLog(levelNumber) { return dLog(levelNumber, 'MturkHitSearch'); }
}
