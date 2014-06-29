// RIDDIT CHROME EXTENSION - AUTHORED BY MAX LARUE
// 9-29-2013
//
// A CROME EXTENSION DESIGNED TO HELP GET RID OF THE UNDESIRABLE LINKS ON REDDIT.COM
//

var Ridditor = {

  // Localstorage key, for looking up the list of hidden links
  storageKey: 'riddit_store',
  
  // JQuery selector for Reddit links
  linkSelector_: '.thing.link[data-fullname]',
  
  // JQuery selector for visible links (for calculating how many are hidden)
  hiddenLinkSelector_: '.thing.link[data-fullname]:hidden',
  
    
  // JQuery selector for visible links (for bulk hide)
  visibleLinkSelector_: '.thing.link[data-fullname]:visible',
  
  
  // JQuery selector for the link list
  listSelector_: '#siteTable',
 
  
  /**
   * HTML for the 'hide' button
   *
   * @private
   */
  buttonHTML_: function(){
    return '<div class="riddit-actions"><div class="riddit-action hide">Hide</div></div>';
  },
  
  /**
   * HTML for the Riddit dashboard
   *
   * @private
   */
  dashboardHTML_: function(){
    var h = '<div class="riddit-dashboard">';
	h    +=   '<div class="riddit-page-status">';
	h    +=     '<div class="riddit-status hidden"><span class="variable"></span> Hidden links on this page</div>';
	h    +=     '<div class="riddit-status hidden_all"><span class="variable"></span> Total hidden</div>';
	h    +=   '</div>';
	h    +=   '<div class="riddit-controls">';
	h    +=     '<div class="riddit-control hide-page">Hide all on page</div>';
	h    +=     '<div class="riddit-control show">Temporarily show hidden links</div>';
	h    +=     '<div class="riddit-control unhide_all">Unhide all hidden links</div>';
	h    +=   '</div>';
	h    += '</div>';
	
	return h;
  },
  




  /**
   * Get the extension up and ready to go.
   * Initialize store, add ridditor UI to the DOM.
   *
   * @public
   */
  initialize: function() {
    this.storeSetup_(); 
	this.uiSetup_();
	this.clense_();
	this.refreshDashboard_();
  },
  
  
  /**
   * Do all the work to remove the link. Find the link that was clicked, store it, remove it from the DOM, and reload the UI
   *
   * @private
   */
  removeLink_: function(event){
    var hideButton  = $(event.currentTarget)
    var linkElement = hideButton.parents(this.linkSelector_);
	var link        = linkElement.data().fullname;
	this.removeLinkFromDOM_(link);
	this.storeAdd_(link);
	this.refreshDashboard_();
  },
  
  /**
   * Hide all visible links
   *
   * @private
   */
  removeLinkBulk_: function(){
    var that = this;
	
    var linkElements = $(this.visibleLinkSelector_);
	linkElements.each(function(i, e){
	  var link = $(e).data().fullname;
	  that.removeLinkFromDOM_(link);
	  that.storeAdd_(link);
	  
	});
  
    this.refreshDashboard_();
  },
  
  
  
   
  
  /**
   * Set up the UI for our extension.
   * Add 'hide' links to the page.
   * Add dashboard
   * Connect event handlers
   * 
   * @private
   */
  uiSetup_: function() {
    var that = this;
	
	// Add our action links to the uI
    $(this.linkSelector_).each(function(i, e){
	  $(e).prepend($(that.buttonHTML_()));
	});
	
	// Bind the onclick event to the newly added links
	$(".riddit-action").on('click', { that : this }, function(event){
	  that.removeLink_(event);
	});
	
	
	// Add the dashboard
	$(this.listSelector_).prepend($(this.dashboardHTML_()));
	
	// Bind click handlers for the newly added dashboard actions
	
	// Temporarily reveal items on the current page - Do not re-show the 'Hide' button
	$('.riddit-control.show').click(function(){
	  $(that.listSelector_ + ' ' + that.hiddenLinkSelector_).show();
	});
	
	// Permanently reveal items on the current page, As well as their hide buttons.
	$('.riddit-control.unhide_all').click(function(){
	  that.storeClear_();
	  that.restoreDOMLinks_();
	  that.refreshDashboard_();
	});
	
	
	// Hide all links on the page
	$('.riddit-control.hide-page').click(function(){
	  that.removeLinkBulk_();
	
	});
  },
  
  /**
   * Refresh the dashboard
   * 
   * @private
   */
  refreshDashboard_: function(){
    // update the hidden-link counter
	// Only include items from the page's list (to avoid banners)
	$('.riddit-status.hidden .variable').html($(this.listSelector_ + ' ' + this.hiddenLinkSelector_).length);
	
	// update the total hidden-link counter
	$('.riddit-status.hidden_all .variable').html($(this.storeFetchAll_()).length);
  },
  
  
  /**
   * Initialize the local storage
   *
   * @private
   */
  storeSetup_: function() {
    if (!localStorage[this.storageKey]) localStorage[this.storageKey] = JSON.stringify([]);
  },
  
    
  /**
   * Add the given link to the store
   *
   * @private
   */
  storeAdd_: function(item) {
    var items = JSON.parse(localStorage[this.storageKey]);
    items.push(item);
    localStorage[this.storageKey] = JSON.stringify(items);
  },
  
  /**
   * Return all of the links that are hidden
   *
   * @private
   */
  storeFetchAll_: function(item) {
    return JSON.parse(localStorage[this.storageKey]);
  },
 

  /**
   * Wipe out any links that have been hidden
   *
   * 
   * @private
   */
  storeClear_: function(item) {
    localStorage[this.storageKey] = JSON.stringify([]);
  },
 


  /**
   * Remove the hidden links from the DOM on pageload
   *
   * @private
   */
  clense_: function() {
    var that          = this;
	var linksToRemove = this.arrayIntersect_(this.getHiddenLinks_(), this.getDOMLinks_());
	
	$(linksToRemove).each(function(i, e){
      that.removeLinkFromDOM_(e);
	});
  },


  /**
   * Retreive, from local storage, any links that the user has hidden.
   *
   * @private
   */
  getHiddenLinks_: function() {
    return this.storeFetchAll_();
  },
  
  
  /**
   * Retreive, from the DOM, all of the Reddit links on the page.
   *
   * @private
   */
  getDOMLinks_: function() {
    return $(this.linkSelector_).map(function(i, e){return $(e).data().fullname});
  },
  
  
  /**
   * Array intersection
   *
   * @private
   */
  arrayIntersect_: function(a, b) {
	return $.grep(a, function(i) {
      return $.inArray(i, b) > -1;
    });
  },
  

  /**
   * Remove the list of given links from the DOM.
   *
   * @private
   */
  removeLinkFromDOM_: function(link) {
	$("[data-fullname=" + link + "]").hide();
	$("[data-fullname=" + link + "] .riddit-action.hide").hide();
  },
  
  

  /**
   * Restore the links on the DOM to their original state. Called after the cache is wiped.
   *
   * @private
   */
  restoreDOMLinks_: function() {
	$(this.listSelector_ + ' ' + this.hiddenLinkSelector_).show();
	$(".riddit-action.hide").show();
  }
};

Ridditor.initialize();


