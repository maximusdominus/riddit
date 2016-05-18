// RIDDIT CHROME EXTENSION - AUTHORED BY MAX LARUE
// 9-29-2013
//
// A CROME EXTENSION DESIGNED TO HELP GET RID OF THE UNDESIRABLE LINKS ON REDDIT.COM
//

var Ridditor = {

  // Localstorage key, for looking up the list of hidden links
  storageKey: 'riddit_store',

  // CSS selector for Reddit links
  linkSelector_: '.thing.link[data-fullname]',

  // CSS selector for Reddit subs
  subSelector_: '.thing .subreddit',

  // CSS selector for visible links (for calculating how many are hidden)
  hiddenLinkSelector_: '.thing.link[data-fullname]:hidden',

  // CSS selector for visible links (for bulk hide)
  visibleLinkSelector_: '.thing.link[data-fullname]:visible',

  // CSS selector for the link list
  listSelector_: '#siteTable',


  /**
   * HTML for the 'hide' link button
   *
   * @private
   */
  hideLinkHTML_: function(){
    return '<div class="riddit-actions"><div class="riddit-action hide">Hide</div></div>';
  },

  /**
   * HTML for the 'block' sub button
   *
   * @private
   */
  blockSubHTML_: function(){
    return '<div class="riddit-actions"><div class="riddit-action block">Block sub</div></div>';
  },

  /**
   * HTML for the Riddit dashboard
   *
   * @private
   */
  dashboardHTML_: function(){
    var h = '<div class="riddit-dashboard">';
    h    +=   '<div class="riddit-page-status">';
    h    +=     '<div class="riddit-status hidden"><span class="variable"></span> Hidden here</div>';
    h    +=     '<div class="riddit-status hidden_all"><span class="variable"></span> Total hidden</div>';
    h    +=     '<div class="riddit-status hidden_subs"><span class="variable"></span> Subs blocked</div>';
    h    +=   '</div>';
    h    +=   '<div class="riddit-controls">';
    h    +=     '<div class="riddit-control hide-page">Hide all</div>';
    h    +=     '<div class="riddit-control show">Temporarily show</div>';
    h    +=     '<div class="riddit-control unhide_subs">Unblock subs</div>';
    h    +=     '<div class="riddit-control unhide_all">Full reset</div>';
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
    if ($('body').hasClass('listing-page')) {
      this.storeSetup_();
      this.migrateStore_();
      this.uiSetup_();
      this.clense_();
      this.refreshDashboard_();
    }
  },


  /**
   * Do all the work to remove the link. Find the link that was clicked, store it, remove it from the DOM, and reload the UI
   *
   * @private
   */
  removeLink_: function(event){
    var hideButton  = $(event.currentTarget);
    var linkElement = hideButton.parents(this.linkSelector_);
    var link        = linkElement.data().fullname;
    this.removeLinkFromDOM_(link);
    this.storeAdd_(link, 'links');
    this.refreshDashboard_();
  },

  /**
   * Do all the work to block a sub. Find the sub that was clicked, store it, remove all from the DOM, and reload the UI
   *
   * @private
   */
  removeSub_: function(event){
    var blockButton  = $(event.currentTarget);
    var linkElement = blockButton.parents(this.linkSelector_);
    var sub         = linkElement.data().subreddit;
    this.removeSubFromDOM_(sub);
    this.storeAdd_(sub, 'subs');
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
      that.storeAdd_(link, 'links');

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
      $(e).prepend($(that.hideLinkHTML_()));
    });

    // Add our action links to the uI
    $(this.subSelector_).each(function(i, e){
      $(e).parent().append($(that.blockSubHTML_()));
    });

    // Bind the onclick event to the newly added links
    $('.riddit-action.hide').on('click', { that : this }, function(event){
      that.removeLink_(event);
    });
    // Bind the onclick event to the newly added links
    $('.riddit-action.block').on('click', { that : this }, function(event){
      that.removeSub_(event);
    });


    // Add the dashboard
    $(this.listSelector_).prepend($(this.dashboardHTML_()));

    // Bind click handlers for the newly added dashboard actions

    // Temporarily reveal items on the current page - Do not re-show the 'Hide' button
    // Show the 'Block' button if the sub is not blocked
    $('.riddit-control.show').click(function(){
        $(that.listSelector_ + ' ' + that.hiddenLinkSelector_).show();

        // reveal all block buttons, then hide to prevent re-blocking
        $('.riddit-action.block').show();
        $(that.getBlockedSubs_()).each(function(i, e){
          $("[data-subreddit=" + e + "] .riddit-action").hide();
        });
    });

    // Unblock subs
    $('.riddit-control.unhide_subs').click(function(){
      if (confirm('Are you sure you want to unblock all subs?')) {
          that.storeClear_('subs');
          that.restoreDOM_();
          that.clense_();
          that.refreshDashboard_();
      }
    });

    // Permanently reveal items on the current page, As well as their hide buttons.
    $('.riddit-control.unhide_all').click(function(){
      if (confirm('Are you sure you want to unhide all links and unblock all subs?')) {
        that.storeClear_('subs');
        that.storeClear_('links');
        that.restoreDOM_();
        that.refreshDashboard_();
      }
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
    $('.riddit-status.hidden_all .variable').html($(this.storeFetchAll_('links')).length);

    // update the hidden-subs counter
    $('.riddit-status.hidden_subs .variable').html($(this.storeFetchAll_('subs')).length);
  },


  /**
   * Initialize the local storage
   *
   * @private
   */
  storeSetup_: function() {
    if (!localStorage[this.storageKey]) localStorage[this.storageKey] = JSON.stringify({links: [], subs: []});
  },


  /**
   * Converts an old store (simply an array) to the new store schema, which stores subs, too. Idempotent
   *
   * @private
   */
  migrateStore_: function() {
    var stored_obj = JSON.parse(localStorage[this.storageKey]);
    if (!stored_obj) {
        localStorage[this.storageKey] = JSON.stringify({links: [], subs: []});
    } else if (Array.isArray(stored_obj)) {
        localStorage[this.storageKey] = JSON.stringify({links: stored_obj, subs: []});
    }
  },


  /**
   * Add the given link to the store in the given category
   *
   * @private
   */
  storeAdd_: function(item, category) {
    var stored_obj = JSON.parse(localStorage[this.storageKey]);
    stored_obj[category].push(item);
    localStorage[this.storageKey] = JSON.stringify(stored_obj);
  },

  /**
   * Return all of the links that are hidden from the given category
   *
   * @private
   */
  storeFetchAll_: function(category) {
    return JSON.parse(localStorage[this.storageKey])[category];
  },


  /**
   * Wipe out any links that have been hidden
   *
   *
   * @private
   */
  storeClear_: function(category) {
    var stored_obj = JSON.parse(localStorage[this.storageKey]);
    stored_obj[category] = [];
    localStorage[this.storageKey] = JSON.stringify(stored_obj);
  },



  /**
   * Remove the hidden links from the DOM on pageload
   *
   * @private
   */
  clense_: function() {
    var that          = this;
    var linksToRemove = this.arrayIntersect_(this.getHiddenLinks_(), this.getDOMLinks_());
    var subsToRemove = this.arrayIntersect_(this.getBlockedSubs_(), this.getDOMSubs_());

    $(linksToRemove).each(function(i, e){
      that.removeLinkFromDOM_(e);
    });

    $(subsToRemove).each(function(i, e){
      that.removeSubFromDOM_(e);
    });
  },


  /**
   * Retreive, from local storage, any links that the user has hidden.
   *
   * @private
   */
  getHiddenLinks_: function() {
    return this.storeFetchAll_('links');
  },

  /**
   * Retreive, from local storage, any subs that the user has blocked.
   *
   * @private
   */
  getBlockedSubs_: function() {
    return this.storeFetchAll_('subs');
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
   * Retreive, from the DOM, all of the Reddit subs on the page.
   *
   * @private
   */
  getDOMSubs_: function() {
    return $(this.linkSelector_).map(function(i, e){return $(e).data().subreddit});
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
    $("[data-fullname=" + link + "] .riddit-action").hide();
  },

  /**
   * Remove the list of given sub from the DOM.
   *
   * @private
   */
  removeSubFromDOM_: function(sub) {
    $("[data-subreddit=" + sub + "]").hide();
    $("[data-subreddit=" + sub + "] .riddit-action").hide();
  },



  /**
   * Restore the links on the DOM to their original state. Called after the cache is wiped.
   *
   * @private
   */
  restoreDOM_: function() {
    $(this.listSelector_ + ' ' + this.hiddenLinkSelector_).show();
    $('.riddit-action').show();
  }
};

Ridditor.initialize();


