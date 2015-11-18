CornellBoxWidget=function( setupDefaultScene )
{
    VG.UI.RenderWidget.call(this);
    VG.context.workspace.autoRedrawInterval=500;

    this.objects=[];

    this.init();
    this.setup( this.context, this.scene, this.objects );

    var mouseDown = false;

    var x = 0;
    var y = 0;

    var storedDelta = 0.001;

    this.keyDown = function(e)
    {
        var scaleRatio = this.context.traceContext.scaleRatio;

        if (e == VG.Events.KeyCodes.One) context.traceContext.scaleRatio = 0.25;
        if (e == VG.Events.KeyCodes.Two) context.traceContext.scaleRatio = 0.50;
        if (e == VG.Events.KeyCodes.Three) context.traceContext.scaleRatio = 1.0;

        if (context.traceContext.scaleRatio != scaleRatio)
        {
            context.traceContext.resetAccumulation = true;
        }
    }

    this.mouseDown = function( event ) 
    { 
        mouseDown = true;

        var hit=this.pipeline.hitTestMeshes( this.context, this.objects, event.pos.x - this.rect.x, event.pos.y - this.rect.y );
        if ( this.hitCallback ) this.hitCallback( hit, this.objects.indexOf( hit ), true );
    }

    this.mouseMove = function( event ) 
    { 
        var hit=this.pipeline.hitTestMeshes( this.context, this.objects, event.pos.x - this.rect.x, event.pos.y - this.rect.y );
        if ( this.hitCallback ) this.hitCallback( hit, this.objects.indexOf( hit ), false );
    }

    this.mouseUp = function(e) { mouseDown = false; }
 
    this.render = function(delta)
    {
        storedDelta = delta;
        //TODO update aspect ratio on a resize callback not here / everyframe
        this.camera.aspect = this.rect.width / this.rect.height;
        this.camera.updateProjection();

        this.context.size2D.set(this.rect.width, this.rect.height);
        
        /* Draws the scene with the pipeline and the given render context */
        this.pipeline.drawScene(this.context, this.scene, delta);
    } 
}

CornellBoxWidget.prototype = Object.create(VG.UI.RenderWidget.prototype);

CornellBoxWidget.prototype.init = function()
{
    var context = new VG.Render.Context();
    // camera
    this.camera = context.camera;
    this.camera.setProjection(60, this.rect.width / this.rect.height);
    this.camera.setRotation(0, 0, 0);
    this.camera.position.z = 14.0;
    this.camera.position.y = 5.0;

    //enable tracing
    context.trace = false;
    this.context=context;

    this.pipeline = new VG.Render.Pipeline();
    this.scene = new VG.Render.SceneManager();
};

CornellBoxWidget.prototype.applyMaterialAtIndex = function( index, matTerminal )
{
    var mesh=this.objects[index];
    mesh.material.opt=matTerminal.onCall();

    mesh.material.needsUpdate=true;
    if ( this.context.traceContext ) this.context.traceContext.sceneChanged=true;
};

CornellBoxWidget.prototype.setup = function( context, scene, objects )
{
    this.clearColor = new VG.Core.Color();

	// wall thickness
    var wt = 0.1;

    var lights = [
        {
            name: "global ambient light",
            color: {
                ambient: new VG.Core.Color(50, 50, 50)
            }
        },
        {
            name: "point light on ceiling",
            color: {
                ambient: new VG.Core.Color(50, 50, 50),
                diffuse: new VG.Core.Color(200, 200, 200),
                specular: new VG.Core.Color(200, 200, 200)
            },
            position: new VG.Math.Vector4(0, 9.6, 0, 1),
            attenuation: {
                constant: 0.5,
                linear: 0.02,
                quadratic: 0.03
            }
        }
    ];
    context.lights = lights;

	/// materials
    var neon = new VG.Render.MtlMaterial( {Kd : [ 3, 3, 3 ], name : "neon white", illum : 0 } );

	// --- Back Wall
    var backWall = new VG.Render.BoxMesh(scene);
	backWall.setGeometry(10, 10, wt);
	backWall.update();
    
    backWall.position.z = -5 + wt/2;
    backWall.position.y = 5;

    backWall.material=new VG.Render.MtlMaterial();
    this.objects.push( backWall );

	// left wall
    var leftWall = new VG.Render.BoxMesh(scene);
	leftWall.setGeometry(wt, 10, 10);
	leftWall.update();

    leftWall.position.x -= 5 - wt / 2;
    leftWall.position.y = 5;

    leftWall.material=new VG.Render.MtlMaterial();
    this.objects.push( leftWall );

	// right wall
    var rightWall = new VG.Render.BoxMesh(scene);
    rightWall.name="Right Wall";    
	rightWall.setGeometry(wt, 10, 10);
	rightWall.update();
    rightWall.position.x += 5 - wt / 2;
    rightWall.position.y = 5;

    rightWall.material=new VG.Render.MtlMaterial();
    this.objects.push( rightWall );

	// floor wall
    var floor = new VG.Render.BoxMesh(scene);
	floor.setGeometry(10, wt, 10);
	floor.update();
    floor.position.y -= wt / 2;

    floor.material=new VG.Render.MtlMaterial();
    this.objects.push( floor );

	// ceiling wall
    var ceiling = new VG.Render.BoxMesh(scene);
	ceiling.setGeometry(10, wt, 10);
	ceiling.update();
    ceiling.position.y += 10 + wt / 2;

	ceiling.material = new VG.Render.MtlMaterial();
    this.objects.push( ceiling );

	// lamp geometry (pseudo)
	var lamp = new VG.Render.BoxMesh(scene);
	lamp.setGeometry(3, 0.1, 3);
	lamp.update();
	lamp.position.y += 10;

    lamp.material = neon;

    // props

    var box1 = new VG.Render.BoxMesh(scene);
	box1.setGeometry(3, 7, 3);
	box1.update();
    box1.position.y += 3.5;
    box1.position.z += 0.5;
    box1.position.x += 3;
    box1.setRotation(45, 0, 0);

	box1.material = new VG.Render.MtlMaterial();
    this.objects.push( box1 );

	//
    var box2 = new VG.Render.BoxMesh(scene);
	box2.setGeometry(3, 3, 3);
	box2.update();

    box2.position.y += 1.5-wt;
    box2.position.z -= 2;
    box2.position.x -= 2;
    box2.setRotation(25, 0, 0);

    box2.material = new VG.Render.MtlMaterial();;
    this.objects.push( box2 );

    //
    var sphere = new VG.Render.SphereMesh( scene, 140 );
    sphere.setRadius(1.5);
    sphere.update();

    sphere.position.y += 1.5 - wt;
    sphere.position.z += 3;
    sphere.position.x -= 0.5;

    sphere.material = new VG.Render.MtlMaterial();;
    this.objects.push( sphere );

    //
    var sphere2 = new VG.Render.SphereMesh( scene, 140 );
    sphere2.setRadius(0.75);
    sphere2.update();

    sphere2.position.y += 3 + 0.75 - wt;
    sphere2.position.z -= 2 - 0.75;
    sphere2.position.x -= 2 + 1.5/2;

    sphere2.material = new VG.Render.MtlMaterial();;
    this.objects.push( sphere2 );    
}

// ---

function vgMain( workspace, args, argc )
{
    this.dc=VG.Data.Collection( "MainData" );
    this.dc.nodes=[];

    var cornellBoxWidget = new CornellBoxWidget(); 
    cornellBoxWidget.minimumSize.width=100;

    // --- Toolbar

    var renderButton=VG.UI.ToolButton( "Render" );
    var renderQuality=VG.UI.DropDownMenu( "Low", "Medium", "High" );
    var renderQualityLabel=VG.UI.Label("  Quality");

    renderButton.clicked=function() {
        if ( !cornellBoxWidget.context.trace ) renderButton.text="Stop";
        else {
            renderButton.text="Render";
            workspace.statusBar.message( "" );            
        }
        cornellBoxWidget.context.trace = !cornellBoxWidget.context.trace;
    }.bind( this );

    renderQuality.changed=function( index ) {
        switch( index ) {
            case 0 : cornellBoxWidget.context.traceContext.scaleRatio=0.25; break;
            case 1 : cornellBoxWidget.context.traceContext.scaleRatio=0.5; break;
            case 2 : cornellBoxWidget.context.traceContext.scaleRatio=1; break;
        }
        cornellBoxWidget.context.traceContext.resetAccumulation=true;
    }.bind( this );
    renderQuality.index=1;

    if ( VG.getHostProperty( VG.HostProperty.Platform ) !== VG.HostProperty.PlatformDesktop ) {
        // --- On Platforms other than Desktop disable Render Button as no Network Rendering yet
        renderButton.disabled=true;
        renderQuality.disabled=true;
        renderQualityLabel.disabled=true;
    }

    var toolbar=VG.UI.ToolBar( renderButton, renderQualityLabel, renderQuality );//, VG.UI.ToolSeparator() );
    workspace.addToolBar( toolbar );

    // --- Layouts

    var popupButton=VG.UI.DropDownMenu( "Back Wall", "Left Wall", "Right Wall", "Floor", "Ceiling", "Big Box", "Small Box", "Big Sphere", "Small Sphere" );
    popupButton.changed=function( index ) {
        popupButton.index=index;
        this.nodeController.selected=this.materials[index].node.data;        
    }.bind( this );

    var rightTopLayout=VG.UI.LabelLayout( "Show Material for", popupButton );
    rightTopLayout.margin.bottom=0;

    // --- Dock Widget
    var dockWidget=VG.UI.DockWidget( "Materials" );
    dockWidget.addItem( rightTopLayout );  

    workspace.addDockWidget( dockWidget, VG.UI.DockWidgetLocation.Right, 30 );

    // --- Create Material NodeGraphh

    this.graph=VG.Nodes.GraphEdit();
    dockWidget.addItem( this.graph.containerLayout );  
    this.nodeController=this.graph.bind( this.dc, "nodes" );
    this.nodeController.addObserver( "selectionChanged", function() {
        var index=this.nodeController.indexOf( this.nodeController.selected );
        if ( index === -1 ) this.nodeController.selected=this.materials[0].node.data;
        else popupButton.index=index;
    }.bind( this ) );

    // ---

    workspace.content = cornellBoxWidget;

    // --- Hit test callback

    cornellBoxWidget.hitCallback=function( mesh, index, clicked  ) {
        if ( index >= 0 && index <= 8) {
            if ( clicked ) {
                popupButton.index=index;
                this.nodeController.selected=this.materials[index].node.data;
            }
            workspace.statusBar.message( popupButton.items[index] );            
        }
        if ( index === -1 ) workspace.statusBar.message( "" );
        VG.update();
    }.bind( this );

    // --- Render Progress Callback

    cornellBoxWidget.context.traceSettings.progressCallback=function( iter, maxIter ) {
        workspace.statusBar.message( "Iterations: " + iter + "/" + maxIter, 2000 );
    }.bind( this );

    // --- Create and apply Materials

    this.defaultMaterialSettings=[
        { Ka : [ 1, 1, 1 ], Kd : [ 1, 1, 0 ], Ks : [ 0.4, 0.4, 0.4 ], Ns: 100, illum : 1 },
        { Ka : [ 0.7, 0.1, 0.1 ], Kd : [ 0.749, 0, 0 ], Ks : [ 0.4, 0.4, 0.4 ], Ns: 100, illum : 2 },
        { Ka : [ 0.1, 0.2, 0.4 ], Kd : [ 44/255, 156/255, 180/255 ], Ks : [ 0.4, 0.4, 0.4 ], Ns: 10, illum : 2 },
        { Ka : [ 1, 1, 1 ], Kd : [ 1, 1, 1 ], Ks : [ 0.4, 0.4, 0.4 ], Ns: 100, illum : 1 },
        { Ka : [ 1, 1, 1 ], Kd : [ 1, 1, 1 ], Ks : [ 0.4, 0.4, 0.4 ], Ns: 100, illum : 1 },
        { Ka : [ 0.2, 0.2, 0.3 ], Kd : [ 0.5, 0.5, 0.9 ], Ks : [ 1, 1, 1 ], Ns: 200, illum : 2 },
        { Ka : [ 0.1, 0.5, 0.1 ], Kd : [ 0, 0.749, 0 ], Ks : [ 1, 1, 1 ], Ns: 200, illum : 2 },
        { Ka : [ 0, 0, 0 ], Kd : [ 0, 0, 0 ], Ks : [ 1, 1, 1 ], Ns: 10, illum : 7, d: 0.4, Ni: 2 },
        { Ka : [ 0, 0, 0 ], Kd : [ 0, 0, 0 ], Ks : [ 1, 1, 1 ], Ns: 20, illum : 3 }
    ];

    this.materials=[];

    // --- Back Wall
    createMtlMaterial( cornellBoxWidget, 0 );
    // --- Left Wall
    createMtlMaterial( cornellBoxWidget, 1 );
    // --- Right Wall
    createMtlMaterial( cornellBoxWidget, 2 );
    // --- Floor
    createMtlMaterial( cornellBoxWidget, 3 );
    // --- Ceiling
    createMtlMaterial( cornellBoxWidget, 4 );
    // --- Big Box
    createMtlMaterial( cornellBoxWidget, 5 );   
    // --- Small Box
    createMtlMaterial( cornellBoxWidget, 6 );   
    // --- Big Sphere -  Inital Glass
    createMtlMaterial( cornellBoxWidget, 7 );   
    // --- Small Sphere - Initial Mirror
    createMtlMaterial( cornellBoxWidget, 8 );   
    
    // --- Update Reflections
    cornellBoxWidget.pipeline.updateEnvMapping( cornellBoxWidget.context, cornellBoxWidget.scene);

    // --- Show UI of Back Wall
    this.nodeController.selected=this.materials[0].node.data;

    // --- Register the DC
    this.workspace.registerDataCollection( this.dc, VG.UI.DataCollectionRole.LoadSaveRole | VG.UI.DataCollectionRole.UndoRedoRole );

    // --- Update Callback
    this.graph.graph.updateCallback=function() {
        cornellBoxWidget.applyMaterialAtIndex( popupButton.index, this.materials[popupButton.index] );
        cornellBoxWidget.pipeline.updateEnvMapping( cornellBoxWidget.context, cornellBoxWidget.scene);        
    }.bind( this );    

    // --- New Callback --- Set all material settings back to their default values
    this.workspace.registerCallback( VG.UI.CallbackType.New, function() {
        for ( var i=0; i <= 8; ++i ) {
            var node=this.materials[i].node;
            applyDefaultMaterialSettings( node, i );

            var matTerminal=node.getTerminal( "out" );            
            cornellBoxWidget.applyMaterialAtIndex( i, matTerminal );
        }
        cornellBoxWidget.pipeline.updateEnvMapping( cornellBoxWidget.context, cornellBoxWidget.scene);        
        this.nodeController.selected=this.materials[popupButton.index].node.data;
    }.bind( this ) );

    // ---

    workspace.createDecoratedToolBar();
    VG.Utils.addDefaultQuickDownloadMenu();
    workspace.addQuickMenuItem( "" );
    var renderQuickItem=workspace.addQuickMenuItem( "RENDER", function() { renderButton.clicked(); renderQuickItem.text=renderButton.text; }.bind( this ) );
    renderQuickItem.disabled=renderButton.disabled;

    workspace.statusBar=VG.UI.StatusBar();
};

// --- Creates a node based material and applies it

function createMtlMaterial( cornellBoxWidget, index )
{
    // --- Create MaterialNode

    var materialNode=new VG.Nodes["NodeMtlMaterial"];
    VG.context.graph.addNode( materialNode, true );
    var matTerminal=materialNode.getTerminal( "out" );

    // ---

    var node=matTerminal.node;

    VG.context.materials.push( matTerminal );
    applyDefaultMaterialSettings( node, index )
    cornellBoxWidget.applyMaterialAtIndex( index, matTerminal );
};

function applyDefaultMaterialSettings( node, index )
{
    var mtl=VG.context.defaultMaterialSettings[index];

    node.setParamColor( "ambientColor", mtl.Ka[0], mtl.Ka[1], mtl.Ka[2] );
    node.setParamColor( "diffuseColor", mtl.Kd[0], mtl.Kd[1], mtl.Kd[2] );
    node.setParamColor( "specularColor", mtl.Ks[0], mtl.Ks[1], mtl.Ks[2] );
    node.setParamNumber( "illum", mtl.illum );
    node.setParamNumber( "specular", mtl.Ns );
    if ( mtl.d ) node.setParamNumber( "dissolve", mtl.d );
    if ( mtl.Ni ) node.setParamNumber( "density", mtl.Ni );
};