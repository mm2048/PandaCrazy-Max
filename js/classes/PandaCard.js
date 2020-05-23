/**
 * @param  {number} myId
 * @param  {object} hitInfo
 * @param  {object} tabsObj
 * @param  {number} tabUnique=null
 * @param  {bool} fromDB=false
 */
class PandaCard {
  constructor(myId, hitInfo, tabsObj, tabUnique=null, fromDB=false) {
    this.myId = myId;
    this.dbId = hitInfo.dbId;
    this.tabsObj = tabsObj;
    this.display = 2;
    this.reqName = {valueName:"reqName", id:"#pcm_hitReqName", label:""};
    this.reqName1Line = {valueName:"reqName", id:"#pcm_hitReqName1", label:""};
    this.friendlyReqName = {valueName:"friendlyReqName", id:"#pcm_hitReqName", label:""};
    this.groupId = {valueName:"groupId", id:"#pcm_groupId", label:""};
    this.price = {valueName:"price", id:"#pcm_hitPrice", label:""};
    this.numbers = {valueName:"hitsAvailable", id:"#pcm_numbers", label:""};
    this.title = {valueName:"title", id:"#pcm_hitTitle", label:""};
    this.friendlyTitle = {valueName:"friendlyTitle", id:"#pcm_hitTitle", label:""};
    this.appendCard(hitInfo, tabUnique, fromDB);
    this.updateAllCardInfo(hitInfo);
  }
  /**
   * @param  {object} hitInfo=null
   */
  updateAllCardInfo(hitInfo=null) {
    if (hitInfo===null) return;
    let titleSelect = $(`${this.title.id}_${this.myId}`);
    const titlePre = ($(titleSelect).attr('data-original-title')!==undefined) ? "data-original-" : "";
    let reqName = (hitInfo.data[this.friendlyReqName.valueName]!=="") ? hitInfo.data[this.friendlyReqName.valueName] : hitInfo.data[this.reqName.valueName];
		$(`${this.reqName.id}_${this.myId}`).attr(`${titlePre}title`, `${reqName}<br>${hitInfo.data[this.groupId.valueName]}`).html(`${reqName}`);
		$(`${this.reqName1Line.id}_${this.myId}`).attr(`${titlePre}title`, `${reqName}<br>${hitInfo.data[this.groupId.valueName]}`).html(`${reqName}`);
		$(`${this.groupId.id}_${this.myId}`).html(`${shortenGroupId(hitInfo.data[this.groupId.valueName])}`);
		$(`${this.price.id}_${this.myId}`).html(`${parseFloat(hitInfo.data[this.price.valueName]).toFixed(2)}`);
		if (hitInfo[this.numbers.valueName]>1) $(`${this.numbers.id}_${this.myId}`).html(`[${hitInfo[this.numbers.valueName]}]`);
    let title = (hitInfo.data[this.friendlyTitle.valueName]!=="") ? hitInfo.data[this.friendlyTitle.valueName] : hitInfo.data[this.title.valueName];
    $(titleSelect).attr(`${titlePre}title`, `${title}`).html(`${title}`);
  }
  /**
   * @param  {number} id
   * @param  {number} myId
   * @param  {string} closest
   * @param  {bool} show
   */
  hideShow(id, myId, closest, show) {
    const ele = (closest!=="") ? $(`${id}_${myId}`).closest(closest) : $(`${id}_${myId}`);
    if (show) $(ele).show(); else $(ele).hide();
  }
  /**
   */
  UpdateCardDisplay() {
    const oneLine = (this.display===0), min = (this.display===1), normal = (this.display===2);
    this.hideShow(this.reqName.id, this.myId, ".pcm_nameGroup", (!oneLine));
    this.hideShow(this.reqName1Line.id, this.myId, ".pcm_nameGroup", (oneLine));
    this.hideShow(this.price.id, this.myId, ".pcm_priceGroup", (!oneLine && !min));
    this.hideShow(this.groupId.id, this.myId, "", (!oneLine));
    this.hideShow(this.title.id, this.myId, "", (!oneLine && !min));
    this.hideShow("#pcm_hitStats", this.myId, "", (!oneLine && !min));
    this.hideShow("#pcm_buttonGroup", this.myId, "", (!oneLine));
    const addThis = (oneLine) ? "pcm_oneLine" : "";
    const removeThis = (!oneLine) ? "pcm_oneLine" : "";
    $(`#pcm_pandaCard_${this.myId}`).addClass(addThis).removeClass(removeThis);
  }
  /**
   * @param  {object} appendHere
   */
  createCardStatus(appendHere) {
    if (this.display>1) $(`<div class="pcm_hitStats" id="pcm_hitStats_${this.myId}"></div>`).html(`[ <span class="pcm_hitAccepted" id="pcm_hitAccepted_${this.myId}"></span> | <span class="pcm_hitFetched" id="pcm_hitFetched_${this.myId}"></span> ]`).appendTo(appendHere)
  }
  /**
   * @param  {object} hitInfo
   * @param  {object} appendhere
   */
  createCardButtonGroup(hitInfo, appendhere) {
    const group = $(`<div class="card-text" id="pcm_buttonGroup_${this.myId}"></div>`).appendTo(appendhere);
    const textCollect = (hitInfo.data.search) ? "-Collecting-" : "Collect";
    const classCollect = (hitInfo.data.search) ? "pcm_buttonOff pcm_searchCollect" : "pcm_buttonOff";
    $(`<button class="btn btn-light btn-xs btn-outline-dark toggle-text pcm_hitButton pcm_collectButton ${classCollect} shadow-none" id="pcm_collectButton_${this.myId}" data-toggle="tooltip" data-html="true" data-placement="bottom" title="Start Collecting this Panda Hit"></button>`).append(`<span>${textCollect}</span>`).appendTo(group);
    if (!hitInfo.data.search) $(`<button class="btn btn-light btn-xs btn-outline-dark toggle-text pcm_hitButton pcm_hamButton pcm_buttonOff shadow-none" id="pcm_hamButton_${this.myId}" data-toggle="tooltip" data-html="true" data-placement="bottom" title="Collect hits from this Panda only! Delayed ham mode can be turned on by clicking and holding this button."></button>`).append(`<span>GoHam</span>`).appendTo(group);
    $(`<button class="btn btn-light btn-xs btn-outline-dark toggle-text pcm_hitButton pcm_detailsButton pcm_buttonOff shadow-none" id="pcm_detailsButton_${this.myId}" data-toggle="tooltip" data-html="true" data-placement="bottom" title="Display and edit all options for this Panda."></button>`).append(`<span>Details</span>`).appendTo(group);
    $(`<button class="btn btn-light btn-xs btn-outline-dark toggle-text pcm_hitButton pcm_deleteButton pcm_buttonOff shadow-none" id="pcm_deleteButton_${this.myId}" data-toggle="tooltip" data-html="true" data-placement="bottom" title="Delete this Panda hit. [CTRL] click to delete multiple hits."></button>`).append(`<span>X</span>`).appendTo(group);
  }
  /**
   */
  oneLineCard() {
    const nameGroup = $(`<div class="pcm_nameGroup row h5 w-100"></div>`).append(`<span class="pcm_reqName col mr-auto px-0 text-truncate" id="pcm_hitReqName1_${this.myId}"></span>`).appendTo(text);
    $(nameGroup).append($(`<span class="pcm_dMenuButton btn dropdown-toggle text-white" type="button" data-toggle="dropdown" id="pcm_dMenuButton_${this.myId}"></span>`).append($(`<div class="dropdown-menu" aria-labelledby="pcm_dMenuButton_"></div>`).append(`<a class="dropdown-item" href="#">Action</a>`)));
  }
  /**
   * @param  {object} hitInfo
   * @param  {object} appendHere
   */
  createCard(hitInfo, appendHere) {
    const searchCard = (hitInfo.data.search) ? " pcm_searching" : "";
    const card = $(`<div class="card text-light border pcm_pandaCard${searchCard}" id="pcm_pandaCard_${this.myId}"></div>`).data("myId",this.myId).appendTo(appendHere);
    const body = $(`<div class="card-body p-0"></div>`).appendTo(card);
    const text = $(`<div class="card-text p-0" id="output_${this.myId}">`).appendTo(body);
    $(`<div class="pcm_nameGroup row w-100"></div>`).hide().append(`<span class="pcm_reqName col mr-auto px-1 text-truncate" id="pcm_hitReqName1_${this.myId}"></span>`).appendTo(text);
    $(`<div class="pcm_nameGroup row w-100 px-0"></div>`).append($(`<span class="pcm_reqName col mr-auto px-0 text-truncate" id="pcm_hitReqName_${this.myId}" data-toggle="tooltip" data-html="true" data-placement="bottom" title=""></span>`)).append($(`<span class="pcm_groupId col col-auto text-right px-0" id="pcm_groupId_${this.myId}"></span>`)).appendTo(text);
    $(`<div class="pcm_priceGroup"></div>`).append($(`<span class="pcm_price text-truncate" id="pcm_hitPrice_${this.myId}"></span>`)).append($(`<span class="pcm_numbers text-truncate pl-1" id="pcm_numbers_${this.myId}"></span>`)).appendTo(text);
    $(`<div class="pcm_title text-truncate" id="pcm_hitTitle_${this.myId}" data-toggle="tooltip" data-html="true" data-placement="bottom" title=""></div>`).appendTo(text);
    this.createCardStatus(text);
    this.createCardButtonGroup(hitInfo, text);
  }
  /**
   * @param  {object} hitInfo
   * @param  {number} tabUnique=null
   * @param  {bool} fromDB=false
   */
  appendCard(hitInfo, tabUnique=null, fromDB=false) { console.log('tabUnique: ',tabUnique);
    const thisTabUnique = (tabUnique!==null) ? tabUnique : this.tabsObj.currentTab;
    console.log('thisTabUnique: ',thisTabUnique);
    if (!fromDB) this.tabsObj.setPosition(thisTabUnique, hitInfo.dbId, !fromDB);
    this.createCard(hitInfo, $(`#pcm-t${thisTabUnique}Content .card-deck`));
  }
  /**
   * @param  {function} removeFunc
   */
  removeCard(removeFunc) {
    $(`#pcm_pandaCard_${this.myId}`).effect('slide', { direction:'left', mode:'hide' }, 300, () => { 
      $(`#pcm_pandaCard_${this.myId}`).remove(); removeFunc.apply();
    });
  }
  /**
   */
  pandaSearchingNow() {
    $(`#pcm_collectButton_${this.myId}`).html("-Searching-").removeClass("pcm_searchCollect")
      .addClass("pcm_searchOn");
  }
  /**
   */
  pandaCollectingNow() {
    $(`#pcm_collectButton_${this.myId}`).html("-Collecting-").removeClass("pcm_searchOn")
      .addClass("pcm_searchCollect");
  }
  /**
   */
  pandaDisabled() {
    $(`#pcm_collectButton_${this.myId}`).html("-Disabled-").removeClass("pcm_searchOn")
      .removeClass("pcm_searchCollect").addClass("pcm_searchDisable");
  }
  /**
   * @param  {function} successFunc=null
   */
  async showDetailsModal(successFunc=null) {
    await bgPanda.getDbData(this.myId);
    const hitInfo = bgPanda.info[this.myId]; console.dir(hitInfo.data);
    const idName = modal.prepareModal(hitInfo.data, "700px", "modal-header-info modal-lg", "Details for a hit", "", "text-right bg-dark text-light", "modal-footer-info", "visible btn-sm", "Save New Details", async (changes) => {
      hitInfo.data = Object.assign(hitInfo.data, changes);
      hitInfo.data.duration *= 60000; bgPanda.timerDuration(this.myId);
      this.updateAllCardInfo(hitInfo);
      await bgPanda.updateDbData(this.myId, hitInfo.data);
      modal.closeModal();
      if (successFunc!==null) successFunc.apply(this, [changes]);
    }, "invisible", "No", null, "visible btn-sm", "Cancel");
    const modalBody = $(`#${idName} .${modal.classModalBody}`);
    const divContainer = $(`<table class="table table-dark table-hover table-sm pcm_detailsTable table-bordered"></table>`).append($(`<tbody></tbody>`)).appendTo(modalBody);
    displayObjectData([
      { label:"Limit # of GroupID in queue:", type:"range", key:"limitNumQueue", min:0, max:24 }, 
      { label:"Limit # of total Hits in queue:", type:"range", key:"limitTotalQueue", min:0, max:24 }, 
      { label:"Accept Only Once:", type:"trueFalse", key:"once" }, 
      { label:"Hits # Accepted Limit:", type:"text", key:"acceptLimit" }, 
      { label:"Stop Collecting After Minutes:", type:"text", key:"duration" }, 
      { label:"Force Delayed Ham on Collect:", type:"trueFalse", key:"autoGoHam" }, 
      { label:"Force Delayed Ham Duration:", type:"text", key:"hamDuration" }, 
      { label:"Friendly Requester Name:", type:"text", key:"friendlyReqName" }, 
      { label:"Friendly Hit Title:", type:"text", key:"friendlyTitle" }, 
      { label:"Requester Name:", type:"text", key:"reqName" }, 
      { label:"Requester ID", type:"text", key:"reqId" }, 
      { label:"Group ID", type:"text", key:"groupId", disable:true }, 
      { label:"Title", type:"text", key:"title", disable:true }, 
      { label:"Description", type:"text", key:"description", disable:true }, 
      { label:"Price", type:"text", key:"price", disable:true }, 
      { label:"Assigned Time", type:"text", key:"assignedTime", disable:true }, 
      { label:"Expires", type:"text", key:"expires", disable:true }, 
      { label:"Date Added", type:"text", key:"dateAdded", disable:true, format:"date" }, 
      { label:"Total Seconds Collecting", type:"text", key:"totalSeconds", disable:true },
      { label:"Total Accepted Hits", type:"text", key:"totalAccepted", disable:true }
    ], divContainer, modal.tempObject[idName], true);
    modal.showModal();
  }
}