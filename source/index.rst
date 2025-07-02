:html_theme.sidebar_secondary.remove: true
:html_theme.sidebar_primary.remove: true
:html_theme.footer.remove: true

Data-Driven Protein Engineering
===============================

.. raw:: html

   <script>
   document.addEventListener('DOMContentLoaded', function() {
      const cards = document.querySelectorAll('#card');
      cards.forEach((card)=> {
         const link2 = card.querySelector('.link-2');
         const link3 = card.querySelector('.link-3');
         const link2Icon = card.querySelector('.arrow-icon-link-2');
         const link3Icon = card.querySelector('.arrow-icon-link-3');
         const link1Icon = card.querySelector('.arrow-icon-link');

         if (link2 === null) return;
         if (link3 === null) return;
         
         card.addEventListener('mouseenter', function() {
            link2Icon.style.display = 'none';
            link3Icon.style.display = 'none';
            link1Icon.style.display = 'inline';
         });

         card.addEventListener('mouseleave', function() {
            link2Icon.style.display = 'none';
            link1Icon.style.display = 'none';
            link3Icon.style.display = 'none';
         });

         link2.addEventListener('mouseenter', function() {
            link1Icon.style.display = 'none';
            link3Icon.style.display = 'none';
            link2Icon.style.display = 'inline';
         });

         link2.addEventListener('mouseleave', function() {
            link1Icon.style.display = 'inline';
            link2Icon.style.display = 'none';
            link3Icon.style.display = 'none';
         });

         link3.addEventListener('mouseenter', function() {
            link1Icon.style.display = 'none';
            link2Icon.style.display = 'none';
            link3Icon.style.display = 'inline';
         });

         link3.addEventListener('mouseleave', function() {
            link1Icon.style.display = 'inline';
            link2Icon.style.display = 'none';
            link3Icon.style.display = 'none';
         });
     });
   });
   </script>
   <div class="landing-page-container">
   <div class="landing-text">
      <p>OpenProtein.AI provides state-of-the-art machine learning models for integration into your protein engineering workflows. Run function prediction, structure prediction, and <i>de novo</i> protein design tools, packaged in our easy-to-use platform. Train custom models or get predictions from our pre-trained foundation models and generative protein language models like AlphaFold2, ESM, and PoET. Our high performance APIs make large scale <i>in silico</i> screening for variant effect prediction and protein library design fast, easy, and cost effective.</p>
      <p>Get started with OpenProtein.AI and discover functional protein sequences optimized to your specifications:</p>
   </div>
      <div class="card-container">
         <div class="card-landing-page" id="card">
            <a href="./web-app/poet/index.html" class="card-link">
               <img class="card-img" src="./_static/overview-img/DocsHome_1.png">
               <div class="card-body">
                  <span>Enhance directed evolution with zero-shot protein design</span>
                  <div>
                     <a class="link" href="./web-app/poet/index.html">Web-based tools</a>
                     <img class="arrow-icon-link" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a href="./python-api/poet/index.html" class="link link-2">Python API tools</a>
                     <img class="arrow-icon-link-2" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a href="./resources/tutorials-examples.html#de-novo-protein-design-and-variant-effect-prediction" class="link link-3">Examples</a>
                     <img class="arrow-icon-link-3" src="./_static/overview-img/arrow-right.png">
                  </div>
               </div>  
            </a>
         </div>
         <div class="card-landing-page" id="card">
            <a class="card-link" href="./web-app/opmodels/index.html">
               <img class="card-img" src="./_static/overview-img/DocsHome_2.png" width="300">
               <div class="card-body">
                  <span>Design variants using large language models to traverse the protein evolutionary landscape</span>
                  <div>
                     <a class="link" href="./web-app/opmodels/index.html">Web-based tools</a>
                     <img class="arrow-icon-link" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a href="./python-api/property-regression-models/index.html" class="link link-2">Python API tools</a>
                     <img class="arrow-icon-link-2" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a href="./resources/index.html#function-prediction-and-optimization-with-your-data" class="link link-3">Examples</a>
                     <img class="arrow-icon-link-3" src="./_static/overview-img/arrow-right.png">
                  </div>
               </div> 
            </a>
         </div>

         <div class="card-landing-page" id="card">
            <a class="card-link" href="./web-app/structure-prediction/index.html">
               <img class="card-img" src="./_static/overview-img/DocsHome_3.png" width="300">
               <div class="card-body">
                  <span>Predict the structure of your designer proteins with deep learning</span>
                  <div>
                     <a class="link" href="./web-app/structure-prediction/index.html">Web-based tools </a>
                     <img class="arrow-icon-link" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a class="link link-2" href="./python-api/structure-prediction/index.html">Python API tools</a>
                     <img class="arrow-icon-link-2" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a class="link link-3" href="./walkthroughs/enzyme-engineering.html#structural-prediction-of-newly-designed-variant">Example</a>
                     <img class="arrow-icon-link-3" src="./_static/overview-img/arrow-right.png">
                  </div>
               </div>      
            </a>
         </div>
         <div class="card-landing-page" id="card">
            <a class="card-link"  href="./web-app/tutorials-examples.html#analyzing-your-data">
               <img class="card-img" src="./_static/overview-img/DocsHome_4.png" width="300">
               <div class="card-body">
                  <span>Visualize your data to better understand and communicate your results</span>
                  <div>
                     <a class="link" href="./web-app/opmodels/uploading-your-data.html#visualizing-your-data">Web-based tools</a>
                     <img class="arrow-icon-link" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div style="display: none;">
                     <a href="./web-app/tutorials-examples.html#analyzing-your-data" class="link link-2">Python API tools</a>
                     <img class="arrow-icon-link-2" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a href="./walkthroughs/antibody-engineering.html#visualizing-our-data" class="link link-3">Example</a>
                     <img class="arrow-icon-link-3" src="./_static/overview-img/arrow-right.png">
                  </div>
               </div>      
            </a>
         </div>
         <div class="card-landing-page" id="card">
            <a class="card-link" href="./web-app/opmodels/design.html">
               <img class="card-img" src="./_static/overview-img/DocsHome_5.png" width="300">
               <div class="card-body">
                  <span>Design cost efficient libraries to maximize ROI with limited resourcing</span>
                  <div>
                     <a class="link" href="./web-app/opmodels/design.html">Web-based tools </a>
                     <img class="arrow-icon-link" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a class="link link-2" href="./python-api/property-regression-models/designing-sequences.html">Python API tools</a>
                     <img class="arrow-icon-link-2" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                     <a class="link link-3" href="./walkthroughs/quantitative-decision-making-library-design.html">Example</a>
                     <img class="arrow-icon-link-3" src="./_static/overview-img/arrow-right.png">
                  </div>
               </div>      
            </a>
         </div>
         <div class="card-landing-page" id="card">
            <a class="card-link" href="./walkthroughs/Embedding_and_visualizing_antibodies.html">
               <img class="card-img" src="./_static/overview-img/DocsHome_6.png" width="300">
               <div class="card-body">
                  <span>Get embeddings and attention maps for integration with your ML pipeline</span>
                  <div>
                     <a class="link" href="./python-api/foundation-models/index.html">Python API tools</a>
                     <img class="arrow-icon-link" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div>
                    <a class=" link link-2" href="./walkthroughs/Embedding_and_visualizing_antibodies.html">Example</a>
                    <img class="arrow-icon-link-2" src="./_static/overview-img/arrow-right.png">
                  </div>
                  <div style="display: none;">
                     <a class="link link-3" href="#"></a>
                     <img class="arrow-icon-link-3" src="./_static/overview-img/arrow-right.png">
                  </div>
               </div>      
            </a>
         </div>
      </div>

      <div class="blue-card-container">
         <span class="getting-started-title">Getting started</span>
         <div class="learn-more">
            <span>Learn more about our tools →</span>
            <a href="./getting-started/get-started-with-no-code.html">With no code</a>
            <a href="./getting-started/get-started-with-our-api.html">With the API</a>
         </div>
      </div>
   </div>
   

Solutions for your application
------------------------------

.. raw:: html

   <div class="landing-page-container">
      <div class="card-container">
         <a href="./walkthroughs/index.html" class="card-landing-page clickable-card">
            <img class="card-icon" src="./_static/overview-img/DocsHome_Antibodies.png" width="80">
            <span class="title">Antibodies</span>
            <div>
               <span class="description">Optimize your antibody sequences for key properties</span>
               <ul>
                  <li>Binding Affinity</li>
                  <li>Activity</li>
                  <li>Immunogenicity</li>
               </ul>
            </div>      
         </a>
         <a href="./walkthroughs/index.html" class="card-landing-page clickable-card">
            <img class="card-icon" src="./_static/overview-img/DocsHome_Enzymes.png" width="80">
            <span class="title">Enzymes</span>
            <div>
                  <span class="description">Design novel variants with desired functionality</span>
                  <ul>
                     <li>Catalytic efficiency</li>
                     <li>Thermostabilty</li>
                     <li>Expression</li>
                  </ul>
            </div>      
         </a>
         <a href="./walkthroughs/index.html" class="card-landing-page clickable-card">
            <img class="card-icon" src="./_static/overview-img/DocsHome_Structural Proteins.png" width="80">
            <span class="title">Structural proteins</span>
            <div>
                  <span class="description">Optimize fitness for your structural proteins of interest</span>
                  <ul>
                     <li>Stability</li>
                     <li>Expression</li>
                  </ul>
            </div>      
         </a>
      </div>
   </div>




.. toctree::
   :maxdepth: 5
   :hidden:

   Getting Started <getting-started/index>
   Web App <web-app/index>
   Python API <python-api/index>
   REST API <rest-api/index>
   Walkthroughs <walkthroughs/index>
   Resources <resources/index>

