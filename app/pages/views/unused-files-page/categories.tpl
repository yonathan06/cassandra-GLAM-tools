{{#each nodes}}
<div class="list_item">
		<div class="row">
			<div class="item col-10">
				<span class="id" id="{{id_encoded}}" data-category="{{id}}" data-total = "{{files}}" >
					{{name}}
				</span>
			</div>
			<div class="item col-2">
				<div class="row">
					<div class="col-2">
					  <span style="font-size: 0.6em; text-transform: uppercase;">{{../langDict.level}}</span>
					</div>
					<div class="col-8 item-number">
						{{group}}
					</div>
				</div>
				<div class="row">
					<div class="col-2">
						<span style="font-size: 0.6em; text-transform: uppercase;">{{../langDict.files}}</span>
					</div>
					<div class="col-8 item-number">
						{{files}}
					</div>
				</div>
			</div>
		</div>
        <div id="category{{id_encoded}}" class="list_item_panel"></div>
		<div class="clear"></div>
</div>
{{/each}}