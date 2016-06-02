/**
 * Created by test1 on 5/31/16.
 */
function VisualizeRepoLogs(p_div, repo_data_json) {

    function _add_new_log(parent, item) {
        var hr=document.createElement("hr");
        hr.style.margin=0;

        var li = document.createElement("li");
        li.className="log_item";

        var span = document.createElement("span");
        span.className="log_item expand-list";
        img = document.createElement("img");
        img.className="log_item_icon expand-list";
        span.appendChild(img);
        var a = document.createElement("a");
        a.innerText = item;
        a.style.marginLeft="5px";
        span.appendChild(a);
        li.appendChild(span);

        parent.appendChild(li)
    }

    var _div = document.createElement("ul");
    _div.style.width = "100%";
    _div.className="expand-list";

    var repo_data=JSON.parse(repo_data_json);

    for (var key in repo_data) {
        var item = repo_data[key];
        var li = document.createElement("li");
        var img = document.createElement("img");
        img.className="collapsed expand-list";
        img.addEventListener("click",function(e){
            process_expand_collapse(e);
        });

        li.appendChild(img);
        var span = document.createElement("span");
        span.className="_title expand-list";
        img = document.createElement("img");
        img.className="title_item expand-list";
        span.appendChild(img);
        var a = document.createElement("a");
        a.innerText = item.title;
        a.style.marginLeft="5px";
        span.appendChild(a);
        li.appendChild(span);

        var title_bar = document.createElement("ul");
        title_bar.style.width = "100%";
        title_bar.className="expand-list";

        for (var key in item.logs) {
             _add_new_log(title_bar, item.logs[key]);
        }

        li.appendChild(title_bar);
        _div.appendChild(li);
        p_div.appendChild(_div);

        span.addEventListener("dblclick",function(e){
            process_expand_collapse(e);
        });

        function process_expand_collapse(event){
            var images=event.currentTarget.parentNode.getElementsByTagName("img");
            if(images.length!=0){
                if(images[0].classList.contains("collapsed")){
                    var nodes_to_expand=event.currentTarget.parentNode.getElementsByTagName("ul");
                    images[0].classList.remove("collapsed");
                    images[0].classList.add("expanded");
                    for(var key in nodes_to_expand)   {
                        var node=nodes_to_expand[key];
                        if(typeof(node)=="object")
                            node.style.display="none";
                    }
                }
                else{
                    var nodes_to_collapse=event.currentTarget.parentNode.getElementsByTagName("ul");
                    images[0].classList.remove("expanded");
                    images[0].classList.add("collapsed");
                    for(var key in nodes_to_collapse)   {
                        var node=nodes_to_collapse[key];
                        if(typeof(node)=="object")
                            node.style.display="block";
                    }
                }
            }
        }

    }
}
