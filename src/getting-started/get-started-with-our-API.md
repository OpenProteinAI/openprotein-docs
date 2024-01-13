---
title: Getting started with OpenProtein.AI’s API
format:
  html:
    code-fold: true
---

Step 1: Request [early access](https://openprotein-ai.webflow.io/early-access-form){target="_blank"}  <br/>
Step 2: Install our python client

You can install the package via [pip](https://pypi.org/project/openprotein-python/){target="_blank"} or [conda](https://anaconda.org/openprotein/openprotein-python/files){target="_blank"} as below:

**pip**
```bash
pip install openprotein-python
```
**conda**
```bash
conda install -c openprotein openprotein-python
```
**Github** <br/>
The source code is available [here](https://github.com/OpenProteinAI/openprotein-python){target="_blank"}.

::: {.callout-tip}
## Want to start with the web version?

Visit [Get started with no code](./get-started-with-no-code.md).
:::

Step 3: Authenticate your session <br/>

Use your username and password credentials generated at sign-up to authenticate your connection to 
OpenProtein backend.

**OpenProtein Job System**

The OpenProtein.AI platform operates with an asynchronous framework. When initiating a task using our Python client, the system schedules the job, returning a prompt response with a unique Job ID. This mechanism ensures that tasks requiring longer processing times do not necessitate immediate waiting.

When you submit a task, such as using the method

```python
session.poet.create_msa()
```

a Future Class is returned for results tracking and access. You can check a job’s status using the `refresh()` and `done()` methods on this Future Class. If you wish to wait for the results, you can use the `wait()` method, or the `get()` method if the results are already completed.
In addition, you can resume a workflow using the `load_job` function along with the unique job ID obtained during task execution. This method will return a `Future Class`, allowing you to continue from where you left off.

**OpenProtein API session**

Executing workflows is acheived with the OpenProtein APISession object (see openprotein.APISession())

```python
session = openprotein.connect(username="username", password="password")
```
You then have access to all the workflows: <br/>
For example
```python
session.data.create()
```
Or
```python
session.poet.create_msa()
```
Step 4: Get started using our [tools](../core/overview.md) for your protein engineering goals <br/>

### Quick start tips
Do you want to...
<br/>
```{=html}
<div class="flex-container">
  
  <div style="margin-left:45px;width:auto"">
    
  </div>
</div>
```
<img src="./img/poet-icon.png"  style="float:left;margin-right:45px" width="60">
**Make sequence predictions or designs without using any data?** <br/>
Get started with [PoET](../poet/introduction-page.md){target="_blank"} which uses evolutionary information to generate protein sequences.


<img src="./img/bar-chart.png"  style="float:left;margin-right:45px" width="60">
**Analyze your experimental data for library design?** <br/>
Create your first project and deploy machine learning models trained on your data <br/>
[Learn more about Core Workflow](../core/overview.md)&emsp;&emsp;&emsp;&emsp;[Get started uploading your data](../core/uploading-your-data.md)

<img src="./img/dna-broken.png"  style="float:left;margin-right:45px" width="60">
**Explore your protein's structure?** <br/>
Use our [Structure Prediction tool](../structure-prediction/using-structure-prediction.md) to view and download high quality images