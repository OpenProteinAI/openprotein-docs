---
title: Upload data
format:
  html:
    code-fold: true
---

## Preparing your dataset for upload

A dataset is expected to be uploaded as a CSV formatted table. It should
have the following columns: 

* the full sequence of each variant and 
* additional columns with measurement values associated with each variant.

<p align="center">
  <img style="display:flex;" src="/main_tutorial_images/03_csv_seq.png" width="800" height="250"></img>
</p>

To upload your dataset to the protein engineering platform, format it as
a CSV table with two columns: the full sequence of each variant and
additional columns with measurement values. Missing measurements are
acceptable.

If you use mutation codes, specify the full wildtype sequence in the
"Sequence options" dropdown, and the platform will enumerate the full
sequence of each variant.

<p align="center">
  <img style="display:flex;" src="/main_tutorial_images/04_csv_mutant.png" width="650" height="500"></img>
</p>

## Creating a project

Upon first login, you will be prompted to create a project. You can name
the project and include a description for your reference.

<p align="center">
  <img src="/main_tutorial_images/05_new_project.png" width="500">
</p>

## Uploading a dataset

You can upload your dataset by clicking on the 'Upload dataset' button
in the navigation panel or the project landing page. This will open a
file explorer where you can select your dataset file.

![](/main_tutorial_images/06_upload_main.png)

You have the option to edit the name of your dataset to your preference.
By default, the name of the uploaded file is used. Additionally, you can
add an optional description to provide more information about your
dataset.To change the selected file, you can click on the "Change..."
button to return to the file explorer and select a different file.

<p align="center">
  <img src="/main_tutorial_images/07_new_upload.png" width="500">
</p>

The application will automatically detect the column where your
sequences are based on the column name.If the column cannot be found, you can manually 
input column type for each column.

<p align="center">
  <img src="/main_tutorial_images/09_wild_type.png" width="500">
</p>

If your table encodes variants using mutant codes, please ensure that
you include the wildtype sequence of your protein under 'Parent sequence'.

<p align="center">
  <img src="/main_tutorial_images/08_seq_options.png" width="500">
</p>

Once you're ready, click "Upload" to initiate the upload process.
