# User documentation 

[Quarto](https://quarto.org/) was used to develop this app

## Running the documentation app locally 
First you will need to:
- Install [Quarto](https://quarto.org/docs/get-started/)
- Install the [vsCode extention](https://marketplace.visualstudio.com/items?itemName=quarto.quarto)
- Clone the repository 

Once that's done you should run
```
quarto preview src
```
## Add new pages 

To add new pages to the website documentation you should create the quarto file "example.qmd" and then add it to the navBar in the "_quarto.yml" file.
The quarto file can contain markdown content as well as jupyter notebooks and formulas. 

## Running with Docker

The repository has been setup with docker to run in production. To run the application, ensure you have docker installed and setup.

``` sh
docker build -t openprotein/openprotein-docs .
docker run -it --rm -p 5002:5002 openprotein/openprotein-docs
```

The app should then be available at localhost:5002
