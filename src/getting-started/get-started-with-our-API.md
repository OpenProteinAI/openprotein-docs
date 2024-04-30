---
title: Getting Started with OpenProtein.AI’s API
format:
  html:
    code-fold: true
---

<div class="step1-api">
  <span>Step 1: Request</span> <a href="https://openprotein-ai.webflow.io/early-access-form" target="_blank">early access</a>
</div>


::: {.callout-caution collapse="true" icon=false}
## Step 2: Install our python client

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

::: {.callout-tip icon=false}
## Want to start with the web version?

Visit [Get started with no code](./get-started-with-no-code.md)
:::
:::

::: {.callout-caution collapse="true" icon=false}
## Step 3: Authenticate your session

Use your username and password credentials generated at sign-up to authenticate your connection to 
OpenProtein backend.

```python
import openprotein

with open('secrets.config', 'r') as f:
    config = json.load(f)

session = openprotein.connect(username= config['username'], password= config['password'])
```

**OpenProtein Job System**

The OpenProtein.AI platform uses a job system to support asynchronous task execution.
Upon initiating a task, the system will schedule a job with a unique Job ID so you can return
at a later time for tasks with long processing times.

**OpenProtein API session**

Executing workflows is achieved with the OpenProtein APISession object (see openprotein.APISession())

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
:::

<div class="step4-api">
  <span>Step 4: Get started with our </span> <a href="https://docs.openprotein.ai/api-python/">Python API docs</a>
</div>

### Quick start tips
Do you want to...
<br/>

:::: {.columns}

::: {.column width="10%"}
<img src="./img/poet-icon.png" height="60">
:::

::: {.column width="5%"}
<!-- empty column to create gap -->
:::

::: {.column width="85%"}
**Make sequence predictions or designs without using any data?** <br/>
Get started with [PoET](../poet/index.md) which uses evolutionary information to generate protein sequences
:::

::::

:::: {.columns}

::: {.column width="10%"}
<img src="./img/bar-chart.png" height="60">
:::

::: {.column width="5%"}
<!-- empty column to create gap -->
:::

::: {.column width="85%"}
**Analyze your experimental data for library design?** <br/>
Create your first project and deploy machine learning models trained on your data <br/>
[Learn more about OP Models](../opmodels/overview.md)&emsp;&emsp;&emsp;[Get started uploading your data](../opmodels/uploading-your-data.md)

:::

::::

:::: {.columns}

::: {.column width="10%"}
<img src="./img/dna-broken.png" height="60">
:::

::: {.column width="5%"}
<!-- empty column to create gap -->
:::

::: {.column width="85%"}
**Explore your protein's structure?** <br/>
Use our [Structure Prediction tool](../structure-prediction/using-structure-prediction.md) to view and download high quality images
:::
::::
