## Running

With docker and gunicorn installed
````sudo bash run.sh````

## Scaling
Since most of the sha encoded endpoints are just static text, it'd be useful to throw some caching behind a proxy. 

It's possible that certain popular/trending phrases/messages could see more usage, and an idea might be to handle those endpoints separately on different machines.


## Deployment
I'm not sure about this one, if it's in a container it seems easy enough to deploy so I think I'd need to know more about the context (what other services are talking to this one, how available should this be)
