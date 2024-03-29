# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| David Friou | 327687 |
| Elias Hörnberg | 384928 |
| Wesley Monteith-Finas  | 324745 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (29th March, 5pm)

**10% of the final grade**

### Dataset

We have selected the [Emergency Events Database (EM-DAT)](https://www.emdat.be/) for our analysis. This database encompasses records of over 26,000 mass disasters worldwide spanning from 1900 to the present day. Established in 1988 through collaboration between the Centre for Research on the Epidemiology of Disasters (CRED) and the World Health Organization (WHO), EM-DAT consolidates data from diverse sources including UN agencies, non-governmental organisations, and research institutes. CRED, affiliated with the University of Louvain and supported by the United States Agency for International Development (USAID), upholds the data's credibility and reliability.

It is worth noting that events predating 2000 are categorised as _"Historic"_ by CRED and may exhibit a lower level of quality. This phenomenon, termed _time bias_, is elucidated further [here](https://doc.emdat.be/docs/known-issues-and-limitations/specific-biases/#time-bias). Therefore, we may implement a filtering mechanism to exclude data prior to 2000. This approach enables us to switch between two versions of the dataset during visualisation: one encompassing historic data to discern long-term trends, and another focusing on more recent and presumably higher-quality records.

The dataset comprises 46 columns, covering various aspects such as disaster type, geographic location, magnitude, human and material consequences, and governmental responses. While 17 columns are mandatory, others are optional, therefore for certain visualisations, we may opt to utilise a subset of the dataset to highlight specific dynamics of interest.


CRED defines a disaster as _“a situation or event that overwhelms local capacity, necessitating a request at the national or international level for external assistance; it is an unforeseen and often sudden event that causes great damage, destruction and human suffering.”_  The disasters in this dataset meet at least one of the following criteria: 
- 10 or more reported deaths
- 100 or more people affected
- Declaration of a state of emergency
- Call for international assistance.

### Problematic

Our main goal with the visualisation is to raise awareness about disasters affecting the world, focusing on both natural phenomena like earthquakes and technological mishaps such as industrial accidents. Especially, we want to shed light on such events affecting the world negatively that fortunate people living in less affected areas might not fully understand the scale of. By fostering heightened awareness, our goal is to inspire greater humanitarian aid donations and support for post-disaster reconstruction efforts.

The key visualisations we prioritise include:
- Show how different categories of disasters are connected. For example, how earthquakes might cause a tsunami. We'll use graphs to make this easier to understand.
- Present the timeline of disasters around the world and its impact to illustrate most affected areas. Possible variables to show related to the disasters could be the number of people affected and economic costs. 
- The most impactful disasters through history, both individual ones and by category, which could be measured based on different variables as victims or economic costs. 
- Identify which time of year most disasters occur to see if there are correlations between seasons and certain disasters. 
- Examining disparities in international responses to disasters, such as disparities in humanitarian aid allocation between different regions of the world.

The target audience for these visualisations, in addition to everyone we want to raise awareness among, are researchers in natural disasters and geography students and educators. These groups might have an idea of the data, but for deeper understanding, great visualisations are important. Accessible visual representations of historical disaster data and their geographical spread will aid anyone interested in the subject in developing a more robust understanding.

### Exploratory Data Analysis

> Pre-processing of the data set you chose
> - Show some basic statistics and get insights about the data

### Related work


> - What others have already done with the data?
> - Why is your approach original?
> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> - In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.

## Milestone 2 (26th April, 5pm)

**10% of the final grade**


## Milestone 3 (31st May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

