# User documentation 

[Quarto](https://quarto.org/){target="_blank"} was used to develop this app

## Running the documentation app locally 
First you will need to:
- Install [Quarto](https://quarto.org/docs/get-started/)
- Install the [vsCode extention](https://marketplace.visualstudio.com/items?itemName=quarto.quarto)
- Clone the repository 

Once that's done you should run
```
quarto preview
```
## Add new pages 

To add new pages to the website documentation you should create the quarto file "example.qmd" and then add it to the navBar in the "_quarto.yml" file.
The quarto file can contain markdown content as well as jupyter notebooks and formulas. 
