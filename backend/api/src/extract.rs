use axum::extract::{FromRequest, Request};
use axum::Json;
use serde::de::DeserializeOwned;

use crate::error::ApiError;

pub struct ContractJson<T>(pub T);

impl<S, T> FromRequest<S> for ContractJson<T>
where
    S: Send + Sync,
    T: DeserializeOwned,
{
    type Rejection = ApiError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        match Json::<T>::from_request(req, state).await {
            Ok(value) => Ok(Self(value.0)),
            Err(rejection) => Err(ApiError::BadRequest(rejection.body_text())),
        }
    }
}
